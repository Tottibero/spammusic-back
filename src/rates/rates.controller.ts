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
import { RatesService } from './rates.service';
import { CreateRateDto } from './dto/create-rates.dto';
import { UpdateRateDto } from './dto/update-rates.dto';
import { PaginationDto } from '../common/dtos/pagination.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/auth/entities/user.entity';

@Controller('rates')
export class RatesController {
  constructor(private readonly ratesService: RatesService) {}

  @Post()
  @Auth()
  create(@Body() createRateDto: CreateRateDto, @GetUser() user: User) {
    return this.ratesService.create(createRateDto, user);
  }

  @Get()
  @Auth()
  findAll(@Query() paginationDto: PaginationDto, @GetUser() user: User) {
    return this.ratesService.findAllByUser(paginationDto, user);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ratesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRateDto: UpdateRateDto,
  ) {
    return this.ratesService.update(id, updateRateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.ratesService.remove(id);
  }

  @Get('/disc/:discId')
  async findRatesByDisc(@Param('discId') discId: string) {
    return this.ratesService.findRatesByDisc(discId);
  }
  @Get('user/:userId/history')
  getUserHistoryQB(
    @Param('userId') userId: string,
    @Query('type') type?: 'rate' | 'cover' | 'both',
    @Query('order') order?: 'ASC' | 'DESC',
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('from') from?: string, // '2025-09-01'
    @Query('to') to?: string, // '2025-09-30'
  ) {
    const dateRange =
      from && to ? ([new Date(from), new Date(to)] as [Date, Date]) : undefined;

    return this.ratesService.findUserActionHistoryPaginatedQB(userId, {
      type: (type as any) ?? 'both',
      order: (order as any) ?? 'DESC',
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
      dateRange,
    });
  }
}
