import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ListStatus, ListType } from '../entities/list.entity';

export class CreateListDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsEnum(ListType)
  type: ListType;

  @IsEnum(ListStatus)
  status: ListStatus;

  @IsOptional()
  @IsDateString()
  listDate?: string | null; // 👈 string (ISO), no Date

  @IsOptional()
  @IsDateString()
  releaseDate?: string | null; // 👈 string (ISO), no Date

  @IsOptional()
  @IsDateString()
  closeDate?: string | null;

  @IsOptional()
  @IsBoolean()
  free?: boolean;
}
