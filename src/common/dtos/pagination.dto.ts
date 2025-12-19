import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { ListStatus } from 'src/lists/entities/list.entity';

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
  @IsString()
  genre?: string; // Permitir el parámetro `query` como opcional

  @IsOptional()
  @IsString()
  type?: string; // Permitir el parámetro `query` como opcional

  @IsOptional()
  voted?: boolean; // Permitir el parámetro `query` como opcional

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @IsDate({ each: true })
  @Transform(({ value }) => {
    // Si viene como array de strings, lo convertimos a fechas
    if (Array.isArray(value)) {
      return value.map((v) => new Date(v));
    }
    return value;
  })
  dateRange?: [Date, Date];

  @IsOptional()
  @IsArray()
  @IsString({ each: true }) // Asegurar que los valores del array sean strings
  statusExclusions?: ListStatus[]; // Excluir ciertos estados

  @IsOptional()
  @IsString()
  orderBy?: string;
}
