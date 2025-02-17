import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateRateDto } from './dto/create-rates.dto';
import { UpdateRateDto } from './dto/update-rates.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rate } from './entities/rate.entity';
import { PaginationDto } from '../common/dtos/pagination.dto';
import { User } from 'src/auth/entities/user.entity';
import { Disc } from 'src/discs/entities/disc.entity';

@Injectable()
export class RatesService {
  private readonly logger = new Logger('RatesService');

  constructor(
    @InjectRepository(Rate)
    private readonly rateRepository: Repository<Rate>,
    // private readonly discRespository: Repository<Disc>,
  ) {}

  async create(createRateDto: CreateRateDto, user: User) {
    try {
      const { discId, ...rateData } = createRateDto;
      const disc = await this.rateRepository.manager.findOne(Disc, {
        where: { id: discId },
      });

      if (!disc) {
        throw new NotFoundException(`Disc with id ${discId} not found`);
      }

      const rate = this.rateRepository.create({
        ...rateData,
        user,
        disc, // Asignar la entidad Disc encontrada
      });

      await this.rateRepository.save(rate);
      return rate;
    } catch (error) {
      this.handleDbExceptions(error);
    }
  }

  async findAllByUser(paginationDto: PaginationDto, user: User) {
    const {
      limit = 10,
      offset = 0,
      query,
      dateRange,
      genre,
      type,
    } = paginationDto;
    const userId = user.id;

    let startDate: Date | undefined;
    let endDate: Date | undefined;
    if (dateRange && dateRange.length === 2) {
      [startDate, endDate] = dateRange;
    }

    const queryBuilder = this.rateRepository
      .createQueryBuilder('rate')
      .leftJoinAndSelect('rate.disc', 'disc') // Relación con los discos
      .leftJoinAndSelect('disc.artist', 'artist') // Relación con los artistas
      .leftJoinAndSelect('disc.genre', 'genre') // Relación con los géneros
      .leftJoin(
        'favorite',
        'favorite',
        'favorite.discId = disc.id AND favorite.userId = :userId',
        { userId },
      ) // Relación con los favoritos del usuario
      .addSelect('favorite.id', 'favoriteId') // Obtener el ID del favorito
      .where('rate.userId = :userId', { userId });

    if (startDate && endDate) {
      queryBuilder.andWhere(
        'disc.releaseDate BETWEEN :startDate AND :endDate',
        { startDate, endDate },
      );
    }

    if (query) {
      const search = `%${query}%`;
      queryBuilder.andWhere(
        '(disc.name ILIKE :search OR artist.name ILIKE :search)',
        { search },
      );
    }

    // **Filtrar según el valor de "genre" en paginationDto**
    if (type === 'rate') {
      queryBuilder.andWhere('rate.rate IS NOT NULL');
    } else if (type === 'cover') {
      queryBuilder.andWhere('rate.cover IS NOT NULL');
    }

    // Cálculo de promedios
    queryBuilder
      .addSelect((subQuery) => {
        return subQuery
          .select('AVG(rate.rate)', 'averageRate')
          .from('rate', 'rate')
          .where('rate.discId = disc.id');
      }, 'averageRate')
      .addSelect((subQuery) => {
        return subQuery
          .select('AVG(rate.cover)', 'averageCover')
          .from('rate', 'rate')
          .where('rate.discId = disc.id');
      }, 'averageCover');

    queryBuilder
      .take(limit)
      .skip(offset)
      .orderBy('disc.releaseDate', 'DESC')
      .addOrderBy('artist.name', 'ASC');

    const { entities: rates, raw } = await queryBuilder.getRawAndEntities();

    // Procesar los resultados para incluir el ID del favorito
    const processedRates = rates.map((rate, index) => ({
      ...rate,
      disc: {
        ...rate.disc,
        userRate: {
          rate: rate.rate,
          cover: rate.cover,
          id: rate.id,
        },
        averageRate: parseFloat(raw[index].averageRate) || null,
        averageCover: parseFloat(raw[index].averageCover) || null,
        favoriteId: raw[index].favoriteId || null, // Agregar el ID del favorito si existe
      },
    }));

    // Obtener el total de elementos
    const totalItemsQueryBuilder = this.rateRepository
      .createQueryBuilder('rate')
      .leftJoin('rate.disc', 'disc')
      .leftJoin('disc.artist', 'artist')
      .leftJoin('disc.genre', 'genre')
      .leftJoin(
        'favorite',
        'favorite',
        'favorite.discId = disc.id AND favorite.userId = :userId',
        { userId },
      )
      .where('rate.userId = :userId', { userId });

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
      data: processedRates,
    };
  }

  async findOne(id: string): Promise<Rate> {
    try {
      const rate = await this.rateRepository.findOneByOrFail({ id });
      return rate;
    } catch (error) {
      throw new NotFoundException(`Rate with id ${id} not found`);
    }
  }

  async update(id: string, updateRateDto: UpdateRateDto) {
    const rate = await this.rateRepository.preload({
      id,
      ...updateRateDto,
    });

    if (!rate) {
      throw new NotFoundException(`Rate with id ${id} not found`);
    }

    try {
      await this.rateRepository.save(rate);
      return rate;
    } catch (error) {
      this.handleDbExceptions(error);
    }
  }

  async remove(id: string) {
    const result = await this.rateRepository.delete({ id });
    if (result.affected === 0) {
      throw new NotFoundException(`Rate with id ${id} not found`);
    }
    return { message: `Rate with id ${id} has been removed` };
  }

  private handleDbExceptions(error: any) {
    // Ej. error.code === '23505' en postgres para entradas duplicadas
    if (error.code === '23505') {
      throw new BadRequestException(error.detail);
    }
    this.logger.error(error);
    throw new InternalServerErrorException('An unexpected error occurred');
  }

  async findRatesByDisc(discId: string) {
    try {
      // Verificamos si el disco existe
      const disc = await this.rateRepository.manager.findOne(Disc, {
        where: { id: discId },
      });

      if (!disc) {
        throw new NotFoundException(`Disc with id ${discId} not found`);
      }

      // Obtenemos todos los rates asociados al disco
      const rates = await this.rateRepository.find({
        where: { disc: { id: discId } },
        relations: ['user'], // Incluye los usuarios en la consulta
      });

      return rates;
    } catch (error) {
      this.handleDbExceptions(error);
    }
  }
}
