import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentsModule } from 'src/contents/contents.module';
import { Spotify } from './entities/spotify.entity';
import { SpotifyService } from './spotify.service';
import { SpotifyController } from './spotify.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Spotify]), ContentsModule],
  controllers: [SpotifyController],
  providers: [SpotifyService],
})
export class SpotifyModule { }
