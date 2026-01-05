import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/auth/entities/user.entity';
import { ContentsService } from './contents.service';
import { ContentType } from './entities/content.entity';
import { Disc } from 'src/discs/entities/disc.entity';
import * as cheerio from 'cheerio';

@Injectable()
export class ContentSchedulerService {
    private readonly logger = new Logger(ContentSchedulerService.name);

    private accessToken: string;
    private tokenExpiration: Date;

    constructor(
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        private readonly contentsService: ContentsService,
        @InjectRepository(Disc)
        private readonly discRepo: Repository<Disc>,
    ) { }


    // Ejecuta todos los días a las 6:00 AM
    @Cron('0 6 * * *', {
        timeZone: 'Europe/Madrid',
    })
    async checkMissingSpotifyLinks() {
        this.logger.log('Starting daily check for missing Spotify links...');
        const today = new Date();

        try {
            // Find discs with missing links or errors that are already released
            const discsToUpdate = await this.discRepo.createQueryBuilder('disc')
                .leftJoinAndSelect('disc.artist', 'artist')
                .leftJoinAndSelect('disc.genre', 'genre')
                .where('disc.releaseDate <= :today', { today })
                .andWhere('(disc.link IS NULL OR disc.link = :empty OR disc.link = :notFound OR disc.link = :error)', {
                    empty: '',
                    notFound: 'No se encontró el álbum',
                    error: 'Error al realizar la búsqueda'
                })
                .getMany();

            this.logger.log(`Found ${discsToUpdate.length} discs to check for Spotify links.`);

            if (discsToUpdate.length === 0) {
                this.logger.log('Found 0 discs to check. Daily check finished.');
                return;
            }

            const token = await this.getSpotifyToken();
            if (!token) {
                this.logger.error('Could not get Spotify token. Daily check finished.');
                return;
            }

            let updatedCount = 0;

            for (const disc of discsToUpdate) {
                try {
                    const query = encodeURIComponent(`album:${disc.name} artist:${disc.artist.name}`);
                    const url = `https://api.spotify.com/v1/search?q=${query}&type=album&limit=1`;
                    this.logger.log(`Spotify Search URL: ${url}`);
                    const response = await fetch(
                        url,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        }
                    );

                    const data = await response.json();

                    if (data.albums?.items?.length > 0) {
                        const album = data.albums.items[0];
                        disc.link = album.external_urls.spotify;
                        disc.image = album.images?.[0]?.url || null;
                        disc.verified = true;

                        await this.discRepo.save(disc);
                        updatedCount++;
                        this.logger.log(`Updated Spotify link for: ${disc.artist.name} - ${disc.name}`);
                    } else {
                        this.logger.log(`Album not found on Spotify. Trying Bandcamp for: ${disc.artist.name} - ${disc.name}`);

                        // Fallback to Bandcamp
                        const bandcampResult = await this.searchBandcamp(disc.artist.name, disc.name);

                        if (bandcampResult) {
                            disc.link = bandcampResult.link;
                            disc.image = bandcampResult.image || disc.image; // Keep existing image if bandcamp doesn't have one? Or prefer bandcamp?
                            disc.verified = true;

                            await this.discRepo.save(disc);
                            updatedCount++;
                            this.logger.log(`Updated Bandcamp link for: ${disc.name} - ${disc.artist.name}`);
                        } else {
                            if (disc.link !== 'No se encontró el álbum') {
                                disc.link = 'No se encontró el álbum';
                                await this.discRepo.save(disc);
                            }
                        }
                    }
                } catch (error) {
                    this.logger.error(`Error searching album ${disc.name}`, error);
                    if (disc.link !== 'Error al realizar la búsqueda') {
                        disc.link = 'Error al realizar la búsqueda';
                        await this.discRepo.save(disc);
                    }
                }
            }

            this.logger.log(`Daily check completed. Updated links for ${updatedCount} discs.`);

        } catch (error) {
            this.logger.error('Error checking missing Spotify links', error);
        }
    }

    // Ejecuta cada lunes a las 8:00 AM
    @Cron('0 8 * * 1', {
        timeZone: 'Europe/Madrid',
    })
    async createWeeklyContent() {
        this.logger.log('Starting weekly content creation job...');

        const now = new Date();
        // Guard: Only run on Mondays (Day 1)
        // This is important because Heroku Scheduler only runs Daily, so we need to skip other days.
        if (now.getDay() !== 1) {
            this.logger.log('Today is not Monday. Skipping weekly content creation.');
            return;
        }

        const author = await this.userRepo.findOne({ select: ['id'], where: {}, order: { id: 'ASC' } }); // Obtener un usuario por defecto (el primero)

        if (!author) {
            this.logger.error('No user found to assign as author for scheduled content');
            this.logger.log('Weekly content creation job finished with error.');
            return;
        }

        // --- 1. Crear Content REUNION (Next Wednesday) ---
        // Calcular el próximo miércoles
        const currentDay = now.getDay(); // 0 = Domingo, 1 = Lunes, ..., 3 = Miércoles
        const daysUntilWednesday = (3 - currentDay + 7) % 7 || 7;

        const nextWednesday = new Date(now);
        nextWednesday.setDate(now.getDate() + daysUntilWednesday);
        nextWednesday.setHours(20, 0, 0, 0); // 20:00 (8 PM)

        const dayReunion = nextWednesday.getDate();
        const monthReunion = nextWednesday.getMonth() + 1;
        const yearReunion = nextWednesday.getFullYear();

        const titleReunion = `Reunion ${dayReunion}-${monthReunion}-${yearReunion}`;

        this.logger.log(`Creating weekly reunion content: ${titleReunion}`);

        try {
            await this.contentsService.create({
                name: titleReunion,
                type: ContentType.REUNION,
                authorId: author.id,
                publicationDate: nextWednesday.toISOString(),
            });
            this.logger.log(`Weekly reunion content created successfully`);
        } catch (error) {
            this.logger.error(`Error creating weekly reunion content: ${error.message}`, error.stack);
        }

        // --- 2. Crear Content RADAR (This Week) ---
        // Se asume que el cron corre el lunes, así que 'now' es lunes de la semana corriente.
        // Título: Radar [Mes] Semana [NumSemana]

        const monthNames = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];

        const currentMonthName = monthNames[now.getMonth()];

        // Calcular número de semana dentro del mes (aproximado)
        const weekOfMonth = Math.ceil(now.getDate() / 7);

        const titleRadar = `Radar ${currentMonthName} Semana ${weekOfMonth}`;

        this.logger.log(`Creating weekly radar content: ${titleRadar}`);

        try {
            await this.contentsService.create({
                name: titleRadar,
                type: ContentType.RADAR,
                authorId: author.id,
                publicationDate: now.toISOString(),
            });
            this.logger.log(`Weekly radar content created successfully`);
        } catch (error) {
            this.logger.error(`Error creating weekly radar content: ${error.message}`, error.stack);
        }

        this.logger.log('Weekly content creation job finished.');
    }

    private async searchBandcamp(artist: string, album: string): Promise<{ link: string, image: string | null } | null> {
        try {
            const query = encodeURIComponent(`${artist} ${album}`);
            const url = `https://bandcamp.com/search?q=${query}&item_type=a`;
            this.logger.log(`Bandcamp Search URL: ${url}`);
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                }
            });

            if (!response.ok) {
                this.logger.warn(`Bandcamp search failed: ${response.statusText}`);
                return null;
            }

            const html = await response.text();
            const $ = cheerio.load(html);

            // Find the first album result
            const firstResult = $('ul.result-items li.searchresult').first();

            if (firstResult.length > 0) {
                const link = firstResult.find('.itemurl').text().trim(); // itemurl class usually contains the cleanup url text, but usually href is better

                const linkElement = firstResult.find('a').first();
                let linkUrl = linkElement.attr('href');

                // Clean up link parameter if it has ?q=... (sometimes search result redirects might act funny, but usually direct links)
                if (linkUrl) {
                    // Get image
                    const imgElement = firstResult.find('img').first();
                    const image = imgElement.attr('src') || null;

                    // Sometimes bandcamp returns a clean URL like https://artist.bandcamp.com/album/name
                    // But sometimes it might have query params.
                    return { link: linkUrl.split('?')[0], image };
                }
            }

            return null;
        } catch (error) {
            this.logger.error(`Error searching Bandcamp for ${artist} - ${album}`, error);
            return null;
        }
    }


    private async getSpotifyToken(): Promise<string | null> {
        if (this.accessToken && this.tokenExpiration && this.tokenExpiration > new Date()) {
            return this.accessToken;
        }

        const clientId = process.env.SPOTIFY_CLIENT_ID;
        const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            this.logger.error('Spotify credentials not found');
            return null;
        }

        try {
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
                },
                body: 'grant_type=client_credentials',
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch token: ${response.statusText}`);
            }

            const data = await response.json();
            this.accessToken = data.access_token;
            this.tokenExpiration = new Date(Date.now() + (data.expires_in - 60) * 1000);
            return this.accessToken;
        } catch (error) {
            this.logger.error('Error getting Spotify token', error);
            return null;
        }
    }
}
