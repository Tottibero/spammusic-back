import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Patch,
} from '@nestjs/common';
import { PointService } from './points.service';
import { CreatePointDto } from './dto/create-points.dto';

@Controller('points')
export class PointController {
  constructor(private readonly pointService: PointService) {}

  @Post()
  async create(@Body() createPointDto: CreatePointDto) {
    return this.pointService.createPoint(createPointDto);
  }

  @Get()
  async findAll() {
    return this.pointService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.pointService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateData: Partial<CreatePointDto>,
  ) {
    return this.pointService.updatePoint(id, updateData);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.pointService.deletePoint(id);
  }
}
