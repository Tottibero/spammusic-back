import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
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
  voted?: boolean; // Permitir el parámetro `query` como opcional

  @IsOptional()
  @IsArray() // Validación para asegurarse de que es un array
  @ArrayMinSize(2) // El array debe contener al menos 2 elementos (startDate y endDate)
  @ValidateNested({ each: true }) // Valida cada elemento del array
  @Type(() => Date) // Convierte los elementos del array a tipo Date
  dateRange?: [Date, Date]; // Parámetro `dateRange` opcional para el rango de fechas

  @IsOptional()
  @IsArray()
  @IsString({ each: true }) // Asegurar que los valores del array sean strings
  statusExclusions?: ListStatus[]; // Excluir ciertos estados
}
