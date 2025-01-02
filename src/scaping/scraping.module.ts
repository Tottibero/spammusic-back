import { Module } from '@nestjs/common';
import { ScrapingService } from './scraping.service';
import { ScrapingController } from './scraping.controler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Artist } from 'src/artists/entities/artist.entity';
import { Disc } from 'src/discs/entities/disc.entity';
import { Country } from 'src/countries/entities/country.entity';
import { Genre } from 'src/genres/entities/genre.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Artist, Disc, Country, Genre]),
    AuthModule,
  ], // Ensure the Disc entity is registered
  controllers: [ScrapingController],
  providers: [ScrapingService],
})
export class ScrapingModule {}
