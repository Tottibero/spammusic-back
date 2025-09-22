import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Spotify } from './entities/spotify.entity';
import { SpotifyService } from './spotify.service';
import { SpotifyController } from './spotify.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Spotify])],
  controllers: [SpotifyController],
  providers: [SpotifyService],
})
export class SpotifyModule {}
