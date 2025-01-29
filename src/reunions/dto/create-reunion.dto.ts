import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, IsDate } from 'class-validator';

export class CreateReunionDto {
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  fecha: Date;
}
