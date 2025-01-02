import { Module } from '@nestjs/common';
import { DiscsService } from './discs.service';
import { DiscsController } from './discs.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Disc } from './entities/disc.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [DiscsController], // Controllers go here
  providers: [DiscsService], // Providers (services) go here
  imports: [TypeOrmModule.forFeature([Disc]), AuthModule], // Ensure the Disc entity is registered
})
export class DiscModule {}
