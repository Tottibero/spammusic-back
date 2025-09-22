// src/spotify/dto/list-spotify.query.dto.ts
import { IsInt, IsOptional, IsString, IsISO8601, Max, Min, IsIn } from 'class-validator';
import { Type, Transform } from 'class-transformer';

const ESTADOS = ['actualizada','publicada','para_publicar','por_actualizar','en_desarrollo'] as const;
const TIPOS = ['festival','especial','genero','otras'] as const;
type SpotifyEstado = typeof ESTADOS[number];
type SpotifyTipo = typeof TIPOS[number];

export class ListSpotifyQueryDto {
  @IsOptional() @IsString()
  q?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase() : value))
  @IsIn(ESTADOS as readonly string[])
  estado?: SpotifyEstado;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase() : value))
  @IsIn(TIPOS as readonly string[])
  tipo?: SpotifyTipo;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  offset?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200)
  limit?: number;

  @IsOptional() @IsISO8601()
  desde?: string;

  @IsOptional() @IsISO8601()
  hasta?: string;
}
