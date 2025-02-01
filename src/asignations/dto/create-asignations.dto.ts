import { IsBoolean, IsNumber, IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class CreateAsignationDto {
  @IsOptional()
  @IsBoolean()
  done?: boolean;

  @IsUUID('4')
  userId: string;

  @IsUUID('4')
  discId: string;

  @IsUUID('4')
  listId: string;

  // Opcional, mismas validaciones que rate
  @ValidateIf((o) => o.rate !== null && o.rate !== undefined)
  @IsOptional()
  @IsNumber()
  position?: number;
}
