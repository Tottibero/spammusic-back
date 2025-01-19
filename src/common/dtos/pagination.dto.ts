import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class PaginationDto {
  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  offset?: number;

  @IsOptional()
  @IsString()
  query?: string; // Permitir el parámetro `query` como opcional
  @IsOptional()
  @IsNumber()
  @Min(1)
  week?: number; // Parámetro `week` opcional para el filtro de semanas
}
