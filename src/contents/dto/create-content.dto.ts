import {
    IsEnum,
    IsString,
    MinLength,
    MaxLength,
    IsOptional,
    IsDateString,
    IsUUID,
} from 'class-validator';
import { ContentType } from '../entities/content.entity';

export class CreateContentDto {
    @IsEnum(ContentType)
    type: ContentType;

    @IsString()
    @MinLength(1)
    @MaxLength(200)
    name: string;

    @IsString()
    @IsOptional()
    notes?: string;

    @IsDateString()
    @IsOptional()
    publicationDate?: string;

    @IsDateString()
    @IsOptional()
    closeDate?: string;

    @IsUUID()
    authorId: string;

    @IsOptional()
    @IsUUID()
    reunionId?: string;
}
