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

  @IsDateString()
  @IsOptional()
  listDate?: Date;

  @IsDateString()
  @IsOptional()
  releaseDate?: Date;

  @IsString()
  @IsOptional()
  link?: string;
}
