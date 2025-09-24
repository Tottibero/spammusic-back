// top-stats-query.dto.ts
import { IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from './pagination.dto';

export class TopStatsQueryDto extends PaginationDto {
  @IsOptional()
  @IsUUID('4')
  genreId?: string;
}
