import { Module } from '@nestjs/common';
import { RatesService } from './rates.service';
import { RatesController } from './rates.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rate } from './entities/rate.entity';
import { AuthModule } from 'src/auth/auth.module';
import { Disc } from 'src/discs/entities/disc.entity';

@Module({
  controllers: [RatesController], // Controladores que gestionan las rutas
  providers: [RatesService], // Servicios que contienen la lógica de negocio
  imports: [TypeOrmModule.forFeature([Rate, Disc]), AuthModule], // Registro de la entidad Rate en TypeORM
})
export class RatesModule {}
