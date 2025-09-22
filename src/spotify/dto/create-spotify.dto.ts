import { IsEnum, IsISO8601, IsString, IsUrl, MaxLength } from 'class-validator';
import { SpotifyEstado, SpotifyTipo } from '../entities/spotify.entity';

export class CreateSpotifyDto {
  @IsString()
  @MaxLength(200)
  nombre: string;

  @IsEnum(SpotifyEstado)
  estado: SpotifyEstado;

  @IsUrl()
  @MaxLength(500)
  enlace: string;

  @IsEnum(SpotifyTipo)
  tipo: SpotifyTipo;

  @IsISO8601()
  fechaActualizacion: string; // vendrá como ISO8601
}
