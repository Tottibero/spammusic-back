// versions/versions.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { VersionsService } from './versions.service';
import { CreateVersionDto } from './dto/create-version.dto';
import { UpdateVersionDto } from './dto/update-version.dto';
import { CreateVersionItemDto } from './dto/create-version-item.dto';
import { UpdateVersionItemDto } from './dto/update-version-item.dto';

@Controller('versions')
export class VersionsController {
  constructor(private readonly versionsService: VersionsService) {}

  // ---- Version CRUD ----
  @Post()
  create(@Body() dto: CreateVersionDto) {
    return this.versionsService.create(dto);
  }

  @Get()
  findAll() {
    return this.versionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.versionsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateVersionDto) {
    return this.versionsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.versionsService.remove(id);
  }

  // ---- Nested Items CRUD ----
  @Get(':versionId/items')
  listItems(@Param('versionId') versionId: string) {
    return this.versionsService.listItems(versionId);
  }

  @Post(':versionId/items')
  createItem(
    @Param('versionId') versionId: string,
    @Body() dto: CreateVersionItemDto,
  ) {
    return this.versionsService.createItem(versionId, dto);
  }

  @Patch(':versionId/items/:itemId')
  updateItem(
    @Param('versionId') versionId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateVersionItemDto,
  ) {
    return this.versionsService.updateItem(versionId, itemId, dto);
  }

  @Delete(':versionId/items/:itemId')
  removeItem(
    @Param('versionId') versionId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.versionsService.removeItem(versionId, itemId);
  }

  @Patch(':id/active')
  setActive(@Param('id') id: string, @Body('active') active: boolean) {
    return this.versionsService.setActive(id, active);
  }

  @Get('public')
  findPublic() {
    return this.versionsService.findPublic();
  }

  @Get('public/latest')
  findLatestPublic() {
    return this.versionsService.findLatestPublic();
  }
  @Get('draft/latest')
  findLatestDraft() {
    return this.versionsService.findLatestDraft();
  }
}
