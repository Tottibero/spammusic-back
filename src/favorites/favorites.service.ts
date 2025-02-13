import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateFavoriteDto } from './dto/create-favorites.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from './entities/favorite.entity';
import { PaginationDto } from '../common/dtos/pagination.dto';
import { User } from 'src/auth/entities/user.entity';
import { Disc } from 'src/discs/entities/disc.entity';

@Injectable()
export class FavoritesService {
  private readonly logger = new Logger('FavoritesService');

  constructor(
    @InjectRepository(Favorite)
    private readonly favoriteRepository: Repository<Favorite>,
    // private readonly discRespository: Repository<Disc>,
  ) {}

  async create(createFavoriteDto: CreateFavoriteDto, user: User) {
    try {
      const { discId, ...favoriteData } = createFavoriteDto;
      const disc = await this.favoriteRepository.manager.findOne(Disc, {
        where: { id: discId },
      });

      if (!disc) {
        throw new NotFoundException(`Disc with id ${discId} not found`);
      }

      const favorite = this.favoriteRepository.create({
        ...favoriteData,
        user,
        disc, // Asignar la entidad Disc encontrada
      });

      await this.favoriteRepository.save(favorite);
      return favorite;
    } catch (error) {
      this.handleDbExceptions(error);
    }
  }

  async findAllByUser(paginationDto: PaginationDto, user: User) {
    const { limit = 10, offset = 0, query, dateRange, genre } = paginationDto;
    const userId = user.id;

    let startDate: Date | undefined;
    let endDate: Date | undefined;
    if (dateRange && dateRange.length === 2) {
      [startDate, endDate] = dateRange;
    }

    const queryBuilder = this.favoriteRepository
      .createQueryBuilder('favorite')
      .leftJoinAndSelect('favorite.disc', 'disc') // Relación con los discos
      .leftJoinAndSelect('disc.artist', 'artist') // Relación con los artistas
      .leftJoinAndSelect('disc.genre', 'genre') // Relación con los géneros
      .leftJoin(
        'rate',
        'rate',
        'rate.discId = disc.id AND rate.userId = :userId',
        { userId },
      ) // Relación con los rates del usuario
      .addSelect('rate.id', 'rateId') // ID del rate
      .addSelect('rate.rate', 'userRate') // Valor del rate
      .addSelect('rate.cover', 'userCover') // Valor del cover
      .where('favorite.userId = :userId', { userId });

    if (startDate && endDate) {
      queryBuilder.andWhere('disc.releaseDate BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    if (query) {
      const search = `%${query}%`;
      queryBuilder.andWhere('(disc.name ILIKE :search OR artist.name ILIKE :search)', { search });
    }

    if (genre) {
      queryBuilder.andWhere('disc.genreId = :genre', { genre });
    }

    queryBuilder
      .take(limit)
      .skip(offset)
      .orderBy('disc.releaseDate', 'DESC')
      .addOrderBy('artist.name', 'ASC');

    const { entities: favorites, raw } = await queryBuilder.getRawAndEntities();

    // Procesar los resultados para incluir los rates si existen
    const processedFavorites = favorites.map((favorite, index) => ({
      ...favorite,
      disc: {
        ...favorite.disc,
        userFavorite: {
          id: favorite.id, // ID del favorito
        },
        userRate: raw[index].rateId
          ? {
              // Si tiene un rate, lo agregamos
              id: raw[index].rateId,
              rate: raw[index].userRate,
              cover: raw[index].userCover,
            }
          : null, // Si no tiene rate, enviamos null
      },
    }));

    // Obtener el total de elementos
    const totalItemsQueryBuilder = this.favoriteRepository
      .createQueryBuilder('favorite')
      .leftJoin('favorite.disc', 'disc')
      .leftJoin('disc.artist', 'artist')
      .leftJoin('disc.genre', 'genre')
      .leftJoin(
        'rate',
        'rate',
        'rate.discId = disc.id AND rate.userId = :userId',
        { userId },
      )
      .where('favorite.userId = :userId', { userId });

    if (startDate && endDate) {
      totalItemsQueryBuilder.andWhere('disc.releaseDate BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    if (query) {
      const search = `%${query}%`;
      totalItemsQueryBuilder.andWhere('(disc.name ILIKE :search OR artist.name ILIKE :search)', { search });
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
      data: processedFavorites,
    };
}

  async findOne(id: string): Promise<Favorite> {
    try {
      const favorite = await this.favoriteRepository.findOneByOrFail({ id });
      return favorite;
    } catch (error) {
      throw new NotFoundException(`Favorite with id ${id} not found`);
    }
  }

  async remove(id: string) {
    const result = await this.favoriteRepository.delete({ id });
    if (result.affected === 0) {
      throw new NotFoundException(`Favorite with id ${id} not found`);
    }
    return { message: `Favorite with id ${id} has been removed` };
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
