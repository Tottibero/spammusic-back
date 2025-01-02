import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ScrapingService } from './scraping.service';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ValidRoles } from 'src/auth/interfaces/valid-roles';
import { BoolintunesDto, HeavyMusicHQDto } from './dtos/scaping.dto';

@Controller('scraping')
@Auth(ValidRoles.admin, ValidRoles.superUser)
export class ScrapingController {
  constructor(private readonly scrapingService: ScrapingService) {}

  @Post('/boolintunes')
  async scrapeBoolintunes(@Body() body: BoolintunesDto) {
    const { month, day } = body;
    if (!month) {
      throw new BadRequestException('Month parameter is required');
    }

    const data = await this.scrapingService.scrapeBoolintunes(month, day);

    return {
      message: 'Scraped data retrieved successfully',
      data,
    };
  }

  @Post('/heavymusichq')
  async getHeavyMusicHQReleases(@Body() body: HeavyMusicHQDto) {
    const { month, day } = body;
    if (!month) {
      throw new BadRequestException('Month parameter is required');
    }

    console.log('body: ' + JSON.stringify(body));
    const data = await this.scrapingService.scrapeHeavyMusicHQAndSave(
      month,
      day,
      true,
    );

    return {
      message: 'Scraped data retrieved successfully',
      data,
    };
  }
}
