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
import { ReunionService } from './reunions.service';
import { CreateReunionDto } from './dto/create-reunion.dto';

@Controller('reunions')
export class ReunionController {
  constructor(private readonly reunionService: ReunionService) {}

  @Post()
  async create(@Body() createReunionDto: CreateReunionDto) {
    return this.reunionService.createReunion(createReunionDto);
  }

  @Get()
  async findAll() {
    return this.reunionService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: number) {
    return this.reunionService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: number,
    @Body() updateData: Partial<CreateReunionDto>,
  ) {
    return this.reunionService.updateReunion(id, updateData);
  }

  @Delete(':id')
  async remove(@Param('id') id: number) {
    return this.reunionService.deleteReunion(id);
  }
}
