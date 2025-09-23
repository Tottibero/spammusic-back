import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { ChangeType, DevState } from '../entities/version-item.entity';

export class CreateVersionItemDto {
  @IsEnum(ChangeType)
  type: ChangeType;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  scope?: string;

  @IsOptional()
  @IsBoolean()
  breaking?: boolean = false;

  @IsOptional()
  @IsBoolean()
  publicVisible?: boolean = false;

  @IsOptional()
  @IsEnum(DevState)
  state?: DevState = DevState.TODO;

  @IsString()
  branch: string;
}
