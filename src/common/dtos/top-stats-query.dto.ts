// top-stats-query.dto.ts
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from './pagination.dto';

export class TopStatsQueryDto extends PaginationDto {
  @IsOptional()
  @IsUUID('4')
  genreId?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  countryId?: string;
}
