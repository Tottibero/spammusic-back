import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
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
  @IsArray() // Validación para asegurarse de que es un array
  @ArrayMinSize(2) // El array debe contener al menos 2 elementos (startDate y endDate)
  @ValidateNested({ each: true }) // Valida cada elemento del array
  @Type(() => Date) // Convierte los elementos del array a tipo Date
  dateRange?: [Date, Date]; // Parámetro `dateRange` opcional para el rango de fechas
}
