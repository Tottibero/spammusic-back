import { IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class CreateRateDto {
  // Valor numérico con máximo 2 decimales, mínimo 1.00 y máximo 9.99
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(10)
  rate: number;

  // Opcional, mismas validaciones que rate
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(10)
  cover?: number;

  // ID de disco (UUID v4)
  @IsUUID('4')
  discId: string;
}
