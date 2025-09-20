import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
  Matches,
  IsBoolean,
} from 'class-validator';
import { CreateVersionItemDto } from './create-version-item.dto';

export class CreateVersionDto {
  @IsString()
  @Length(1, 50)
  // Si usas SemVer, puedes forzar formato (opcional):
  @Matches(/^\d+\.\d+\.\d+(-[\w.-]+)?$/, {
    message: 'version debe seguir SemVer, p.ej. 1.2.3 o 1.2.3-beta',
  })
  version: string;

  @IsOptional()
  @IsDateString()
  releaseDate?: string; // usa string ISO en DTO; TypeORM lo mapea a Date

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean; // 👈

  @IsOptional()
  @IsDateString()
  publishedAt?: string; // 👈 opcional

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVersionItemDto)
  items?: CreateVersionItemDto[];
}
