import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reunion } from './entities/reunion.entity';
import { ReunionService } from './reunions.service';
import { ReunionController } from './reunions.controller';

import { ContentsModule } from 'src/contents/contents.module';
import { forwardRef } from '@nestjs/common';

@Module({
  imports: [TypeOrmModule.forFeature([Reunion]), forwardRef(() => ContentsModule)], // Importa solo la entidad Reunion
  controllers: [ReunionController],
  providers: [ReunionService],
  exports: [ReunionService, TypeOrmModule], // Exporta el servicio y el repositorio (TypeOrmModule)
})
export class ReunionsModule { }
