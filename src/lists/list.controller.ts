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
import { ListsService } from './list.service';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { PaginationDto } from '../common/dtos/pagination.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/auth/entities/user.entity';

@Controller('lists')
export class ListsController {
  constructor(private readonly listsServices: ListsService) {}

  @Post()
  create(@Body() createListDto: CreateListDto) {
    return this.listsServices.create(createListDto);
  }

  @Get()
  @Auth()
  findAll(@Query() paginationDto: PaginationDto, @GetUser() user: User) {
    return this.listsServices.findAll(paginationDto);
  }

  @Get('weeks')
  @Auth()
  findTwoWeeks() {
    return this.listsServices.findUpcoming();
  }

  @Get('next')
  @Auth()
  findNext() {
    return this.listsServices.findNext();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.listsServices.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateListDto: UpdateListDto,
  ) {
    return this.listsServices.update(id, updateListDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.listsServices.remove(id);
  }
}
