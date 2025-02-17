import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from './common/common.module';
import { I18nConfigModule } from './i18n/i18n.module';

//MODULES
import { GenresModule } from './genres/genres.module';
import { CountriesModule } from './countries/countries.module';
import { ArtistsModule } from './artists/artists.module';
import { DiscModule } from './discs/discs.module';
import { ScrapingModule } from './scaping/scraping.module';
import { AuthModule } from './auth/auth.module';
import { RatesModule } from './rates/rates.module';
import { AsignationsModule } from './asignations/asignations.module';
import { ListsModule } from './lists/list.module';
import { ReunionsModule } from './reunions/reunions.module';
import { PointsModule } from './points/points.module';
import { LinksModule } from './links/links.module';
import { SeedModule } from './seeds/seed.module';
import { FavoritesModule } from './favorites/favorites.module';
import { PendingsModule } from './pendings/pendings.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      ssl: process.env.STAGE === 'prod',
      extra: {
        ssl:
          process.env.STAGE === 'prod' ? { rejectUnauthorized: false } : null,
      },
      type: 'postgres',
      host: process.env.DB_HOST,
      port: +process.env.DB_PORT,
      database: process.env.DB_NAME,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      autoLoadEntities: true,
      synchronize: true,
    }),
    I18nConfigModule,
    CommonModule,

    //MODULES
    GenresModule,
    CountriesModule,
    ArtistsModule,
    DiscModule,
    ScrapingModule,
    AuthModule,
    RatesModule,
    AsignationsModule,
    ListsModule,
    ReunionsModule,
    PointsModule,
    LinksModule,
    SeedModule,
    FavoritesModule,
    PendingsModule,
  ],
})
export class AppModule {}
