import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/auth/entities/user.entity';
import { ContentsService } from './contents.service';
import { ContentType } from './entities/content.entity';

@Injectable()
export class ContentSchedulerService {
    private readonly logger = new Logger(ContentSchedulerService.name);

    constructor(
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        private readonly contentsService: ContentsService,
    ) { }

    // Ejecuta cada lunes a las 8:00 AM
    @Cron('0 8 * * 1', {
        timeZone: 'Europe/Madrid',
    })
    async createWeeklyContent() {
        this.logger.log('Starting weekly content creation job...');

        const now = new Date();
        const author = await this.userRepo.findOne({ select: ['id'], where: {}, order: { id: 'ASC' } }); // Obtener un usuario por defecto (el primero)

        if (!author) {
            this.logger.error('No user found to assign as author for scheduled content');
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
                type: ContentType.MEETING,
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
    }
}
