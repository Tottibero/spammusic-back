import { Module } from '@nestjs/common';
import { LinksService } from './links.service';
import { LinksController } from './links.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Link } from './entities/links.entity';
import { AuthModule } from 'src/auth/auth.module';
import { List } from 'src/lists/entities/list.entity';

@Module({
  controllers: [LinksController], // Controladores que gestionan las rutas
  providers: [LinksService], // Servicios que contienen la lógica de negocio
  imports: [TypeOrmModule.forFeature([Link, List]), AuthModule], // Registro de la entidad Link en TypeORM
})
export class LinksModule {}
