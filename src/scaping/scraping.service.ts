import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer-core';
import chromium from 'chrome-aws-lambda';
import * as fs from 'fs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Artist } from 'src/artists/entities/artist.entity';
import { Disc } from 'src/discs/entities/disc.entity';
import { Country } from 'src/countries/entities/country.entity';
import { Genre } from 'src/genres/entities/genre.entity';

@Injectable()
export class ScrapingService {
  private logStream: fs.WriteStream;

  constructor(
    @InjectRepository(Artist)
    private readonly artistRepository: Repository<Artist>,

    @InjectRepository(Disc)
    private readonly discRepository: Repository<Disc>,

    @InjectRepository(Country)
    private readonly countryRepository: Repository<Country>,

    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,
  ) {
    this.logStream = fs.createWriteStream('scraping.log', { flags: 'a' });
  }

  private log(message: string) {
    const timestamp = new Date().toISOString();
    this.logStream.write(`[${timestamp}] ${message}\n`);
  }

  /**
   * Lanza el navegador utilizando chrome-aws-lambda y puppeteer-core.
   */
  private async launchBrowser() {
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    });

    return browser;
  }

  /**
   * Scraping Boolintunes
   */
  async scrapeBoolintunes(month: string, day?: number) {
    this.log(`Iniciando scraping de Boolintunes para ${month} ${day || ''}...`);

    const browser = await this.launchBrowser();
    const page = await browser.newPage();

    try {
      page.on('console', (msg) => this.log(`PAGE LOG: ${msg.text()}`));

      await page.goto('https://boolintunes.com/calendar/');
      await page.waitForSelector('.gutentor-module-accordion-body');

      const data = await page.evaluate(() => {
        const accordionBodies = document.querySelectorAll(
          '.gutentor-module-accordion-body',
        );
        const structuredData = [];

        accordionBodies.forEach((accordionBody) => {
          const htmlContent = accordionBody.innerHTML;
          const lines = htmlContent.split('<br>').map((line) => line.trim());
          let currentDate = '';

          lines.forEach((line) => {
            const dateMatch = line.match(/<span[^>]*>([^<]+)<\/span>/);
            if (dateMatch && dateMatch[1]) {
              const dateWithoutOrdinal = dateMatch[1].replace(
                /(\d+)(st|nd|rd|th)/,
                '$1',
              );
              currentDate = `${dateWithoutOrdinal}, 2024`;
            } else if (
              line.includes('<strong>') &&
              line.includes('–') &&
              currentDate
            ) {
              const albumDetail = line.replace(/<[^>]+>/g, '').trim();
              if (albumDetail) {
                const entryIndex = structuredData.findIndex(
                  (entry) => entry.date === currentDate,
                );
                if (entryIndex !== -1) {
                  structuredData[entryIndex].albums.push(albumDetail);
                } else {
                  structuredData.push({
                    date: currentDate,
                    albums: [albumDetail],
                  });
                }
              }
            }
          });
        });

        return structuredData;
      });

      await browser.close();

      // Filtramos la data de Boolintunes
      const filteredData = this.filterByDayAndMonth(data, month, day);

      fs.writeFileSync(
        `boolintunes_${month}_${day || 'all'}.json`,
        JSON.stringify(filteredData, null, 2),
      );

      this.log('Scraping completado con éxito.');
      return filteredData;
    } catch (error) {
      this.log(`Error durante el scraping de Boolintunes: ${error}`);
      await browser.close();
      throw error;
    }
  }

  /**
   * Scraping HeavyMusicHQ
   */
  async scrapeHeavyMusicHQ(month: string, day?: number) {
    this.log(
      `Iniciando scraping de HeavyMusicHQ para ${month}${day ? ' ' + day : ''}...`,
    );

    const browser = await this.launchBrowser();
    const page = await browser.newPage();

    try {
      page.on('console', (msg) => this.log(`PAGE LOG: ${msg.text()}`));

      await page.goto(
        'https://heavymusichq.com/heavy-metal-album-release-calendar/',
      );
      await page.waitForSelector('.post-single-content');

      // Extraemos texto sin procesar de los párrafos
      const rawData = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('.thecontent p'));
        return elements.map((element) => (element as HTMLElement).innerText);
      });

      this.log(`Raw data extraído: ${JSON.stringify(rawData, null, 2)}`);
      await browser.close();

      // Filtramos y estructuramos la data (sin comparar el año)
      const structuredData = this.filterAndStructureReleases(
        rawData,
        month,
        day,
      );

      this.log(
        `Datos estructurados: ${JSON.stringify(structuredData, null, 2)}`,
      );
      return structuredData;
    } catch (error) {
      this.log(`Error durante el scraping de HeavyMusicHQ: ${error}`);
      await browser.close();
      throw error;
    }
  }

  /**
   * Filtra y estructura la data:
   * - Determina cuándo una línea es una fecha (ej: "January 3, 2025")
   * - Acumula los álbums en arrays según la fecha
   */
  private filterAndStructureReleases(
    rawData: string[],
    desiredMonth: string,
    desiredDay?: number,
  ) {
    const structuredReleases: { date: string; albums: string[] }[] = [];
    let currentDate: string | null = null;

    this.log('Iniciando filtrado y estructuración...');

    rawData.forEach((line) => {
      // Si la línea tiene formato "MonthName dayNumber, year"
      if (/^\w+ \d{1,2}, \d{4}$/.test(line)) {
        // Verificamos si coincide el mes y el día (ignoramos el año)
        if (this.isDateInDesiredMonth(line, desiredMonth, desiredDay)) {
          currentDate = line;
          structuredReleases.push({ date: currentDate, albums: [] });
          this.log(`Fecha válida añadida: ${currentDate}`);
        } else {
          currentDate = null;
          this.log(`Fecha fuera del rango: ${line}`);
        }
      }
      // Si estamos dentro de una fecha válida, acumulamos los álbums
      else if (currentDate && line.trim() !== '') {
        const albums = line
          .split('\n')
          .map((album) => album.trim())
          .filter((album) => album !== '');

        if (albums.length > 0) {
          structuredReleases[structuredReleases.length - 1].albums.push(
            ...albums,
          );
          this.log(`Álbumes añadidos: ${JSON.stringify(albums)}`);
        }
      }
    });

    // Retornamos solo las que sí tengan álbums
    const filteredReleases = structuredReleases.filter(
      (entry) => entry.albums.length > 0,
    );

    this.log(
      `Estructura final filtrada: ${JSON.stringify(filteredReleases, null, 2)}`,
    );
    return filteredReleases;
  }

  /**
   * Comprueba si el 'dateString' (p.ej. "January 3, 2025")
   * coincide con el mes y el día deseados, ignorando el año.
   */
  private isDateInDesiredMonth(
    dateString: string,
    desiredMonth: string,
    desiredDay?: number,
  ): boolean {
    try {
      // Partimos en espacios: ["January", "3,", "2025"]
      const [monthName, dayString] = dateString.split(' ');

      // Le quitamos la coma al día ( "3," => "3" )
      const parsedDay = parseInt(dayString.replace(',', ''), 10);

      // Verificamos mes
      const isSameMonth =
        monthName.toLowerCase() === desiredMonth.toLowerCase();

      // Verificamos día (si se especificó)
      const isSameDay = desiredDay ? parsedDay === desiredDay : true;

      // Como queremos ignorar el año, NO lo parseamos.
      return isSameMonth && isSameDay;
    } catch (error) {
      this.log(`Error al analizar fecha: ${dateString} - ${error}`);
      return false;
    }
  }

  /**
   * Filtra la data de Boolintunes por mes y día (ignorando año).
   */
  private filterByDayAndMonth(
    data: { date: string; albums: string[] }[],
    month: string,
    day?: number,
  ) {
    return data.filter((item) => {
      // Suponiendo que item.date viene en formato "January 3, 2024"
      const [monthName, dayNumber] = item.date.split(' ');

      if (monthName.toLowerCase() !== month.toLowerCase()) {
        return false;
      }

      if (!day) {
        return true; // no se especifica día, devolvemos todo el mes
      }

      // Parsear día quitando la coma
      const parsedDay = parseInt(dayNumber.replace(',', ''), 10);
      return parsedDay === day;
    });
  }

  async scrapeHeavyMusicHQAndSave(
    month: string,
    day?: number,
    saveToDB?: boolean,
  ) {
    // 1) Hacemos scraping
    const data = await this.scrapeHeavyMusicHQ(month, day);

    // 2) Si el usuario quiere, guardamos en la DB
    if (saveToDB) {
      await this.importScrapedData(data);
    }

    return data;
  }

  private parseDateString(dateStr: string): Date | null {
    // Patron: "<MonthName> <day>, <year>"
    // p.ej. "January 3, 2025"
    try {
      const [monthName, dayWithComma, yearString] = dateStr.split(' ');
      const day = parseInt(dayWithComma.replace(',', ''), 10);
      const year = parseInt(yearString, 10);

      // Convertir mes a número 0-11
      const months = {
        january: 0,
        february: 1,
        march: 2,
        april: 3,
        may: 4,
        june: 5,
        july: 6,
        august: 7,
        september: 8,
        october: 9,
        november: 10,
        december: 11,
      } as Record<string, number>;

      const monthIndex = months[monthName.toLowerCase()];
      if (monthIndex === undefined) {
        return null;
      }

      return new Date(year, monthIndex, day);
    } catch {
      return null;
    }
  }

  private async importScrapedData(
    scrapedData: { date: string; albums: string[] }[],
  ) {
    // Buscamos "Sin pais" y "Sin genero"
    const defaultCountry = await this.countryRepository.findOne({
      where: { name: 'Sin pais' },
    });
    const defaultGenre = await this.genreRepository.findOne({
      where: { name: 'Sin genero' },
    });

    for (const entry of scrapedData) {
      const { date, albums } = entry;

      // Parseamos la fecha (p.ej. "January 3, 2025" => Date)
      const releaseDate = this.parseDateString(date);

      this.log(`Procesando fecha: ${date} => releaseDate: ${releaseDate}`);

      for (const albumLine of albums) {
        // Formato: "Artista – Disco (Label)"

        if (albumLine.toLowerCase().includes('re-release')) {
          this.log(`Omitiendo álbum (Re-Release): ${albumLine}`);
          continue;
        }

        const [artistName, discInfo] = albumLine.split(' – ');

        if (!artistName || !discInfo) {
          this.log(`Formato inesperado: ${albumLine}`);
          continue;
        }

        // Extraemos el label si lo hay
        let discName = discInfo.trim();
        const match = discName.match(/\(([^)]+)\)$/);
        if (match) {
          discName = discName.replace(`(${match[1]})`, '').trim();
        }

        // 1) Ver si el artista ya existe
        let artist = await this.artistRepository.findOne({
          where: { name: artistName },
        });
        if (!artist) {
          artist = this.artistRepository.create({
            name: artistName,
            description: '',
            image: '',
            country: defaultCountry ?? undefined,
          });
          artist = await this.artistRepository.save(artist);
        }

        // 2) Ver si el disco ya existe para ese artista
        let disc = await this.discRepository.findOne({
          where: { name: discName, artist: { id: artist.id } },
        });
        if (!disc) {
          disc = this.discRepository.create({
            name: discName,
            description: '',
            image: '',
            verified: false,
            link: '',
            artist,
            genre: defaultGenre ?? undefined,
            // GUARDAMOS LA FECHA
            releaseDate: releaseDate ?? null,
          });
          disc = await this.discRepository.save(disc);
        } else {
          // Si existe y quieres actualizar su fecha (por ejemplo):
          // disc.releaseDate = releaseDate ?? null;
          // disc = await this.discRepository.save(disc);
        }

        this.log(
          `OK => Artista "${artistName}" => Disco "${discName}" => Fecha: ${releaseDate}`,
        );
      }
    }
  }
}
