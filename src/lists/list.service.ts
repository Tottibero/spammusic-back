import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, MoreThan, Repository } from 'typeorm';
import { List } from './entities/list.entity';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { PaginationDto } from '../common/dtos/pagination.dto';

@Injectable()
export class ListsService {
  private readonly logger = new Logger('ListsService');

  constructor(
    @InjectRepository(List)
    private readonly listRepository: Repository<List>,
  ) {}

  async create(createListDto: CreateListDto) {
    try {
      const list = this.listRepository.create(createListDto);
      await this.listRepository.save(list);
      return list;
    } catch (error) {
      this.handleDbExceptions(error);
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;

    const [lists, totalItems] = await this.listRepository.findAndCount({
      take: limit,
      skip: offset,
      order: {
        name: 'ASC',
      },
    });

    const totalPages = Math.ceil(totalItems / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return {
      totalItems,
      totalPages,
      currentPage,
      limit,
      data: lists,
    };
  }

  async findUpcoming() {
    const today = new Date();
    const twoWeeksFromToday = new Date();
    twoWeeksFromToday.setDate(today.getDate() + 14);

    const lists = await this.listRepository.find({
      where: {
        releaseDate: Between(today, twoWeeksFromToday), // Usa Between para definir el rango
      },
      order: {
        releaseDate: 'ASC',
      },
    });
    return lists;
  }

  async findNext() {
    const today = new Date();
    const twoWeeksFromToday = new Date();
    twoWeeksFromToday.setDate(today.getDate() + 14);

    const lists = await this.listRepository.find({
      where: {
        releaseDate: MoreThan(twoWeeksFromToday), // Usa Between para definir el rango
      },
      order: {
        releaseDate: 'ASC',
      },
    });
    return lists;
  }

  async findOne(id: string): Promise<List> {
    try {
      const list = await this.listRepository.findOneByOrFail({ id });
      return list;
    } catch (error) {
      throw new NotFoundException(`List with id ${id} not found`);
    }
  }

  async update(id: string, updateListDto: UpdateListDto) {
    const list = await this.listRepository.preload({
      id: id,
      ...updateListDto,
    });

    if (!list) throw new NotFoundException(`List with id ${id} not found`);

    try {
      await this.listRepository.save(list);
      return list;
    } catch (error) {
      this.handleDbExceptions(error);
    }
  }

  async remove(id: string) {
    const list = await this.listRepository.delete({ id });
    return list;
  }

  private handleDbExceptions(error: any) {
    if (error.code === '23505') throw new BadRequestException(error.detail);
    this.logger.error(error);
    throw new InternalServerErrorException(
      'An unexpected error occurred',
      error,
    );
  }
}
