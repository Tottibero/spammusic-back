import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ScrapingService } from './scraping.service';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ValidRoles } from 'src/auth/interfaces/valid-roles';

@Controller('scraping')
@Auth(ValidRoles.admin, ValidRoles.superUser)
export class ScrapingController {
  constructor(private readonly scrapingService: ScrapingService) {}

  @Get('/boolintunes')
  async scrapeBoolintunes(@Query('month') month: string) {
    if (!month) {
      throw new BadRequestException('Month parameter is required');
    }

    const data = await this.scrapingService.scrapeBoolintunes(month);

    // Devuelve los datos directamente para pruebas
    return {
      message: 'Scraped data retrieved successfully',
      data,
    };
  }
  @Get('/heavymusichq')
  async getHeavyMusicHQReleases(
    @Query('month') month: string,
    @Query('day') day?: string,
    @Query('save') save?: string,
  ) {
    if (!month) {
      return { message: 'Please provide a valid month.' };
    }

    const numericDay = day ? parseInt(day, 10) : undefined;
    if (day && (isNaN(numericDay) || numericDay < 1 || numericDay > 31)) {
      return { message: 'Please provide a valid day (1-31).' };
    }

    // si save es 'true', hacemos la importación
    const saveToDB = save === 'true';

    const data = await this.scrapingService.scrapeHeavyMusicHQAndSave(
      month,
      numericDay,
      saveToDB,
    );

    return { message: 'Scraped data retrieved successfully', data };
  }
}
