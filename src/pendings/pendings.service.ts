import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreatePendingDto } from './dto/create-pendings.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pending } from './entities/pending.entity';
import { PaginationDto } from '../common/dtos/pagination.dto';
import { User } from 'src/auth/entities/user.entity';
import { Disc } from 'src/discs/entities/disc.entity';

@Injectable()
export class PendingsService {
  private readonly logger = new Logger('PendingsService');

  constructor(
    @InjectRepository(Pending)
    private readonly pendingRepository: Repository<Pending>,
    // private readonly discRespository: Repository<Disc>,
  ) {}

  async create(createPendingDto: CreatePendingDto, user: User) {
    try {
      const { discId, ...pendingData } = createPendingDto;
      const disc = await this.pendingRepository.manager.findOne(Disc, {
        where: { id: discId },
      });

      if (!disc) {
        throw new NotFoundException(`Disc with id ${discId} not found`);
      }

      const pending = this.pendingRepository.create({
        ...pendingData,
        user,
        disc, // Asignar la entidad Disc encontrada
      });

      await this.pendingRepository.save(pending);
      return pending;
    } catch (error) {
      this.handleDbExceptions(error);
    }
  }

  async findAllByUser(paginationDto: PaginationDto, user: User) {
    const { limit = 10, offset = 0, query, dateRange, genre } = paginationDto;
    const userId = user.id;

    // Definir rango de fechas si se proporciona
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    if (dateRange && dateRange.length === 2) {
      [startDate, endDate] = dateRange;
    }

    const queryBuilder = this.pendingRepository
      .createQueryBuilder('pending')
      .leftJoinAndSelect('pending.disc', 'disc') // Relación con los discos
      .leftJoinAndSelect('disc.artist', 'artist') // Relación con los artistas
      .leftJoinAndSelect('disc.genre', 'genre') // Relación con los géneros
      .where('pending.userId = :userId', { userId }); // Filtrar por usuario

    // Aplicar filtro de rango de fechas
    if (startDate && endDate) {
      queryBuilder.andWhere(
        'disc.releaseDate BETWEEN :startDate AND :endDate',
        {
          startDate,
          endDate,
        },
      );
    }

    // Aplicar filtro de búsqueda
    if (query) {
      const search = `%${query}%`;
      queryBuilder.andWhere(
        '(disc.name ILIKE :search OR artist.name ILIKE :search)',
        { search },
      );
    }

    // Aplicar filtro de género
    if (genre) {
      queryBuilder.andWhere('disc.genreId = :genre', { genre });
    }

    // Aplicar paginación
    queryBuilder
      .take(limit)
      .skip(offset)
      .orderBy('disc.releaseDate', 'DESC') // Ordenar por fecha de lanzamiento
      .addOrderBy('artist.name', 'ASC'); // Ordenar por nombre del artista

    const { entities: pendings, raw } = await queryBuilder.getRawAndEntities();

    // Procesar las entidades para incluir valores calculados
    const processedPendings = pendings.map((pending, index) => ({
      ...pending,
      disc: {
        ...pending.disc,
        userPending: {
          id: pending.id,
        },
        averagePending: parseFloat(raw[index].averagePending) || null,
        averageCover: parseFloat(raw[index].averageCover) || null,
      },
    }));

    // Obtener el total de elementos para la paginación
    const totalItemsQueryBuilder = this.pendingRepository
      .createQueryBuilder('pending')
      .leftJoin('pending.disc', 'disc')
      .leftJoin('disc.artist', 'artist')
      .leftJoin('disc.genre', 'genre')
      .where('pending.userId = :userId', { userId });

    if (startDate && endDate) {
      totalItemsQueryBuilder.andWhere(
        'disc.releaseDate BETWEEN :startDate AND :endDate',
        { startDate, endDate },
      );
    }

    if (query) {
      const search = `%${query}%`;
      totalItemsQueryBuilder.andWhere(
        '(disc.name ILIKE :search OR artist.name ILIKE :search)',
        { search },
      );
    }

    if (genre) {
      totalItemsQueryBuilder.andWhere('disc.genreId = :genre', { genre });
    }

    const totalItems = await totalItemsQueryBuilder.getCount();
    const totalPages = Math.ceil(totalItems / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return {
      totalItems,
      totalPages,
      currentPage,
      limit,
      data: processedPendings,
    };
  }

  async findOne(id: string): Promise<Pending> {
    try {
      const pending = await this.pendingRepository.findOneByOrFail({ id });
      return pending;
    } catch (error) {
      throw new NotFoundException(`Pending with id ${id} not found`);
    }
  }

  async remove(id: string) {
    const result = await this.pendingRepository.delete({ id });
    if (result.affected === 0) {
      throw new NotFoundException(`Pending with id ${id} not found`);
    }
    return { message: `Pending with id ${id} has been removed` };
  }

  private handleDbExceptions(error: any) {
    // Ej. error.code === '23505' en postgres para entradas duplicadas
    if (error.code === '23505') {
      throw new BadRequestException(error.detail);
    }
    this.logger.error(error);
    throw new InternalServerErrorException('An unexpected error occurred');
  }
}
