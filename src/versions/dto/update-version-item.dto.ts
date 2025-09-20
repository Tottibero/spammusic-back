// versions/dto/update-version-item.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateVersionItemDto } from './create-version-item.dto';

export class UpdateVersionItemDto extends PartialType(CreateVersionItemDto) {}
