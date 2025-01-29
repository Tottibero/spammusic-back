import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Point } from './entities/point.entity';
import { PointService } from './points.service';
import { PointController } from './points.controller';
import { ReunionsModule } from 'src/reunions/reunions.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([Point]), // Importa la entidad Point
    ReunionsModule, // Importa el módulo Reunion para acceder al servicio
  ],
  controllers: [PointController],
  providers: [PointService],
})
export class PointsModule {}
