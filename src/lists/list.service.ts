import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Inject,
  forwardRef
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, MoreThan, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { List, ListType, ListStatus } from './entities/list.entity';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { PaginationDto } from '../common/dtos/pagination.dto';
import { Content } from 'src/contents/entities/content.entity';

@Injectable()
export class ListsService {
  private readonly logger = new Logger('ListsService');

  constructor(
    @InjectRepository(List)
    private readonly listRepository: Repository<List>,
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
  ) { }

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
    const { limit = 40, offset = 0, statusExclusions = [] } = paginationDto;

    const whereConditions: any = {};

    if (statusExclusions.length > 0) {
      whereConditions.status = Not(In(statusExclusions));
    }

    const [lists, totalItems] = await this.listRepository.findAndCount({
      take: limit,
      skip: offset,
      where: whereConditions,
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
        releaseDate: Between(today, twoWeeksFromToday),
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
        releaseDate: MoreThan(twoWeeksFromToday),
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

      // Update associated Content if sync required
      if (updateListDto.closeDate || updateListDto.releaseDate || updateListDto.listDate) {
        const content = await this.contentRepository.findOne({ where: { list: { id: list.id } } });

        if (content) {
          let changed = false;

          // Sync closeDate
          if (list.closeDate) {
            const listCloseDate = new Date(list.closeDate);
            const contentCloseDate = content.closeDate ? new Date(content.closeDate) : null;
            if (!contentCloseDate || contentCloseDate.getTime() !== listCloseDate.getTime()) {
              content.closeDate = listCloseDate;
              changed = true;
            }
          }

          // Sync publicationDate with releaseDate (NOT listDate)
          if (list.releaseDate) {
            const releaseDate = new Date(list.releaseDate);
            const contentDate = content.publicationDate ? new Date(content.publicationDate) : null;
            if (!contentDate || contentDate.getTime() !== releaseDate.getTime()) {
              content.publicationDate = releaseDate;
              changed = true;
            }
          }

          // Sync list.listDate -> content.listDate (for RADAR, BEST, and VIDEO)
          if (list.type === 'week' || list.type === 'month' || list.type === 'video') { // week = RADAR, month = BEST, video = VIDEO
            if (list.listDate) {
              const listListDate = new Date(list.listDate);
              const contentListDate = content.listDate ? new Date(content.listDate) : null;
              if (!contentListDate || contentListDate.getTime() !== listListDate.getTime()) {
                content.listDate = listListDate;
                changed = true;
              }
            }
          }

          if (changed) {
            await this.contentRepository.save(content);
            this.logger.log(`Updated content ${content.id} from list sync`);
          }
        }
      }

      return list;
    } catch (error) {
      this.handleDbExceptions(error);
    }
  }

  async removeList(id: string) {
    const list = await this.listRepository.findOne({ where: { id } });

    if (!list) {
      throw new NotFoundException(`List with id ${id} not found`);
    }

    // Find and delete associated content
    const content = await this.contentRepository.findOne({ where: { list: { id: list.id } } });
    if (content) {
      await this.contentRepository.remove(content);
      this.logger.log(`Deleted associated content ${content.id}`);
    }

    return this.listRepository.remove(list);
  }

  // Obtener todas las listas especiales
  async findAllSpecialLists() {
    const lists = await this.listRepository.find({
      where: {
        type: ListType.SPECIAL,
      },
      order: {
        name: 'ASC',
      },
    });
    return lists;
  }

  // Obtener todas las listas de video
  async findAllVideoLists() {
    const lists = await this.listRepository.find({
      where: {
        type: ListType.VIDEO,
      },
      order: {
        name: 'ASC',
      },
    });
    return lists;
  }

  // Obtener listas mensuales actuales y futuras
  async findCurrentMonthLists() {
    const today = new Date();
    today.setDate(1); // Set to first day of current month
    today.setHours(0, 0, 0, 0);

    const lists = await this.listRepository.find({
      where: {
        type: ListType.MONTH,
        listDate: MoreThanOrEqual(today),
      },
      order: {
        listDate: 'ASC',
      },
    });
    return lists;
  }

  // Obtener listas mensuales pasadas por año
  async findPastMonthListsByYear(year: number) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    endDate.setHours(23, 59, 59, 999);

    const lists = await this.listRepository.find({
      where: {
        type: ListType.MONTH,
        listDate: Between(startDate, endDate),
      },
      order: {
        listDate: 'DESC',
      },
    });
    return lists;
  }

  // Obtener listas semanales actuales y futuras
  async findCurrentWeeklyLists() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lists = await this.listRepository.find({
      where: {
        type: ListType.WEEK,
        listDate: MoreThanOrEqual(today),
      },
      order: {
        listDate: 'ASC',
      },
    });
    return lists;
  }

  // Obtener listas semanales pasadas por año y mes
  async findPastWeeklyListsByMonth(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    endDate.setHours(23, 59, 59, 999);

    const lists = await this.listRepository.find({
      where: {
        type: ListType.WEEK,
        listDate: Between(startDate, endDate),
      },
      order: {
        listDate: 'DESC',
      },
    });
    return lists;
  }

  // Obtener listas de video actuales y futuras (Mismá lógica que mensuales)
  async findCurrentVideoLists() {
    const today = new Date();
    today.setDate(1);
    today.setHours(0, 0, 0, 0);

    return this.listRepository.find({
      where: {
        type: ListType.VIDEO,
        listDate: MoreThanOrEqual(today),
      },
      order: {
        listDate: 'ASC',
      },
    });
  }

  // Obtener listas de video pasadas por año
  async findPastVideoListsByYear(year: number) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    endDate.setHours(23, 59, 59, 999);

    return this.listRepository.find({
      where: {
        type: ListType.VIDEO,
        listDate: Between(startDate, endDate),
      },
      order: {
        listDate: 'DESC',
      },
    });
  }

  async createVideoList(releaseDate?: Date, listDate?: Date, listName?: string) {
    let targetReleaseDate: Date;

    if (releaseDate) {
      targetReleaseDate = new Date(releaseDate);
    } else {
      targetReleaseDate = new Date(); // Use current date if none provided
    }

    // Set to 1st of month to normalize if it represents a monthly video list
    targetReleaseDate.setDate(1);
    targetReleaseDate.setHours(0, 0, 0, 0);

    // Determine targetListDate
    let targetListDate: Date;
    if (listDate) {
      targetListDate = new Date(listDate);
    } else {
      targetListDate = new Date(targetReleaseDate);
    }
    // Also normalize to 1st of month for video lists? Assuming yes based on logic.
    targetListDate.setDate(1);
    targetListDate.setHours(0, 0, 0, 0);

    const monthNames = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const currentMonthName = monthNames[targetListDate.getMonth()];
    const name = listName || `Videos ${currentMonthName}`; // Use provided name or default naming convention

    try {
      // Check if exists first? Or rely on unique constraint? Lists usually don't have unique name constraint but might be good to check.
      // But for now, just create.
      const list = this.listRepository.create({
        name,
        type: ListType.VIDEO,
        status: ListStatus.NEW,
        listDate: targetListDate,
        releaseDate: targetReleaseDate,
      });

      await this.listRepository.save(list);
      this.logger.log(`Video list created: ${name}`);
      return list;
    } catch (error) {
      this.handleDbExceptions(error);
    }
  }

  async createWeeklyList(releaseDate?: Date, listDate?: Date) {
    let targetReleaseDate: Date;

    if (releaseDate) {
      targetReleaseDate = new Date(releaseDate);
    } else {
      const now = new Date();
      // Calcular el próximo lunes
      const currentDay = now.getDay();
      const daysUntilMonday = currentDay === 0 ? 1 : (8 - currentDay) % 7 || 7;

      targetReleaseDate = new Date(now);
      targetReleaseDate.setDate(now.getDate() + daysUntilMonday);
    }

    targetReleaseDate.setHours(0, 0, 0, 0);

    // Determine targetListDate (for naming and listDate field)
    let targetListDate: Date;
    if (listDate) {
      targetListDate = new Date(listDate);
    } else {
      targetListDate = new Date(targetReleaseDate);
    }
    targetListDate.setHours(0, 0, 0, 0);


    const monthNames = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    // Use targetListDate for naming
    const currentMonthName = monthNames[targetListDate.getMonth()];
    const weekOfMonth = Math.ceil(targetListDate.getDate() / 7);

    const name = `Discos ${currentMonthName} Semana ${weekOfMonth}`;

    try {
      const list = this.listRepository.create({
        name,
        type: ListType.WEEK,
        status: ListStatus.NEW,
        listDate: targetListDate,
        releaseDate: targetReleaseDate,
      });

      await this.listRepository.save(list);
      this.logger.log(`Weekly list created: ${name}`);
      return list;
    } catch (error) {
      this.handleDbExceptions(error);
    }
  }

  async createMonthlyList(releaseDate?: Date, listDate?: Date) {
    let targetReleaseDate: Date;

    if (releaseDate) {
      targetReleaseDate = new Date(releaseDate);
    } else {
      const now = new Date();
      // Default to the first day of the next month
      targetReleaseDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }

    targetReleaseDate.setHours(0, 0, 0, 0);

    // Determine targetListDate
    let targetListDate: Date;
    if (listDate) {
      targetListDate = new Date(listDate);
    } else {
      targetListDate = new Date(targetReleaseDate);
    }
    targetListDate.setHours(0, 0, 0, 0);

    const monthNames = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    // Use targetListDate for naming
    const monthName = monthNames[targetListDate.getMonth()];
    const year = targetListDate.getFullYear();

    const name = `Discos ${monthName} ${year}`;

    try {
      const list = this.listRepository.create({
        name,
        type: ListType.MONTH,
        status: ListStatus.NEW,
        listDate: targetListDate,
        releaseDate: targetReleaseDate,
      });

      await this.listRepository.save(list);
      this.logger.log(`Monthly list created: ${name}`);
      return list;
    } catch (error) {
      this.handleDbExceptions(error);
    }
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
