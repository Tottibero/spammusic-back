import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ScrapingService } from './scraping.service';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ValidRoles } from 'src/auth/interfaces/valid-roles';

@Controller('scraping')
@Auth(ValidRoles.admin, ValidRoles.superUser)
export class ScrapingController {
  constructor(private readonly scrapingService: ScrapingService) {}

  @Post('/process-manual-data')
  async processManualData(@Body() body: { date: string; albums: string[] }) {
    const { date, albums } = body;

    if (!date) {
      throw new BadRequestException('Date parameter is required');
    }

    if (!albums || !Array.isArray(albums) || albums.length === 0) {
      throw new BadRequestException(
        'Albums parameter must be a non-empty array',
      );
    }

    const data = await this.scrapingService.processManualData(date, albums);

    return {
      message: 'Data processed successfully',
      data,
    };
  }
}
