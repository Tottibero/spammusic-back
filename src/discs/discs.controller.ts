import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { DiscsService } from './discs.service';
import { CreateDiscDto } from './dto/create-discs.dto';
import { UpdateDiscDto } from './dto/update-discs.dto';
import { PaginationDto } from '../common/dtos/pagination.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/auth/entities/user.entity';

@Controller('discs')
export class DiscsController {
  constructor(private readonly discsServices: DiscsService) {}

  @Post()
  create(@Body() createDiscDto: CreateDiscDto) {
    return this.discsServices.create(createDiscDto);
  }

  @Get('date')
  @Auth()
  findAllByDate(
    @Query() paginationDto: PaginationDto,
    @GetUser() user: User,
  ) {
    return this.discsServices.findAllByDate(paginationDto, user);
  }

  @Auth()
  @Get('homeDiscs')
  findTopRatedOrFeatured(
    @Query() paginationDto: PaginationDto,
    @Query('genreId') genreId: string,
    @GetUser() user: User,
  ) {
    return this.discsServices.findTopRatedOrFeaturedAndStats(
      paginationDto,
      user, 
      genreId
    );
  }

  @Get()
  @Auth()
  findAll(@Query() paginationDto: PaginationDto, @GetUser() user: User) {
    return this.discsServices.findAll(paginationDto, user);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.discsServices.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDiscDto: UpdateDiscDto,
  ) {
    return this.discsServices.update(id, updateDiscDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.discsServices.remove(id);
  }
}
