import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateDiscDto } from './dto/create-discs.dto';
import { UpdateDiscDto } from './dto/update-discs.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Disc } from './entities/disc.entity';
import { PaginationDto } from '../common/dtos/pagination.dto';
import { User } from 'src/auth/entities/user.entity';
import { Genre } from 'src/genres/entities/genre.entity';
@Injectable()
export class DiscsService {
  private readonly logger = new Logger('DiscsService');

  constructor(
    @InjectRepository(Disc)
    private readonly discRepository: Repository<Disc>,
  ) {}

  async create(createDiscDto: CreateDiscDto) {
    try {
      const disc = this.discRepository.create(createDiscDto);
      await this.discRepository.save(disc);
      return disc;
    } catch (error) {
      this.handleDbExceptions(error);
    }
  }

  async findAll(paginationDto: PaginationDto, user: User) {
    const { limit = 10, offset = 0 } = paginationDto;

    const userId = user.id;

    const today = new Date(); // Usar el objeto Date directamente

    const queryBuilder = this.discRepository
      .createQueryBuilder('disc')
      .leftJoinAndSelect('disc.artist', 'artist') // Incluye la relación de artista
      .leftJoinAndSelect('disc.genre', 'genre') // Incluye la relación de género
      .leftJoinAndSelect(
        'disc.rates',
        'rate',
        'rate.userId = :userId', // Filtro para las calificaciones del usuario específico
        { userId },
      )
      .addSelect((subQuery) => {
        return subQuery
          .select('AVG(rate.rate)', 'averageRate')
          .from('rate', 'rate')
          .where('rate.discId = disc.id');
      }, 'averageRate') // Alias debe ser "averageRate"
      .addSelect((subQuery) => {
        return subQuery
          .select('AVG(rate.cover)', 'averageCover')
          .from('rate', 'rate')
          .where('rate.discId = disc.id');
      }, 'averageCover') // Media de las calificaciones de cover
      .where('disc.releaseDate <= :today', { today })
      .take(limit)
      .skip(offset)
      .orderBy('disc.releaseDate', 'DESC') // Ordenar por fecha de lanzamiento (descendente)
      .addOrderBy('artist.name', 'ASC'); // Luego ordenar por nombre del artista (ascendente)

    const { entities: discs, raw } = await queryBuilder.getRawAndEntities();
    // Mapea los valores crudos de averageRate y averageCover a las entidades
    const processedDiscs = discs.map((disc, index) => ({
      ...disc,
      userRate: disc.rates.length > 0 ? disc.rates[0] : null,
      averageRate: parseFloat(raw[index].averageRate) || null, // Agrega averageRate
      averageCover: parseFloat(raw[index].averageCover) || null, // Agrega averageCover
    }));

    const totalItems = await this.discRepository.count({
      where: { releaseDate: LessThanOrEqual(today) },
    });

    const totalPages = Math.ceil(totalItems / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return {
      totalItems,
      totalPages,
      currentPage,
      limit,
      data: processedDiscs,
    };
  }

  async findAllByDate(paginationDto: PaginationDto, user: User) {
    const { limit = 10, offset = 0 } = paginationDto;

    const userId = user.id;

    const queryBuilder = this.discRepository
      .createQueryBuilder('disc')
      .leftJoinAndSelect('disc.artist', 'artist') // Incluye la relación de artista
      .leftJoinAndSelect('disc.genre', 'genre') // Incluye la relación de género
      .leftJoinAndSelect(
        'disc.rates',
        'rate',
        'rate.userId = :userId', // Filtro para calificaciones del usuario específico
        { userId },
      )
      .take(limit)
      .skip(offset)
      .orderBy('disc.releaseDate', 'ASC') // Cambia a 'ASC' si quieres orden ascendente
      .addOrderBy('artist.name', 'ASC'); // Luego ordenar por name en orden ascendente

    const [discs, totalItems] = await queryBuilder.getManyAndCount();

    const totalPages = Math.ceil(totalItems / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    // Agrupar discos por fechas de lanzamiento
    const groupedDiscs = discs.reduce((acc, disc) => {
      const dateKey = new Date(disc.releaseDate).toISOString().split('T')[0]; // Mantén solo la fecha
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push({
        ...disc,
        userRate: disc.rates.length > 0 ? disc.rates[0] : null, // Devuelve la votación del usuario o null si no existe
      });
      return acc;
    }, {});

    // Convertir el objeto agrupado en un array de objetos para mejor legibilidad
    const groupedArray = Object.keys(groupedDiscs).map((releaseDate) => ({
      releaseDate,
      discs: groupedDiscs[releaseDate],
    }));

    return {
      totalItems,
      totalPages,
      currentPage,
      limit,
      data: groupedArray,
    };
  }

  async findOne(id: string): Promise<Disc> {
    try {
      const disc = await this.discRepository.findOneByOrFail({ id });
      return disc;
    } catch (error) {
      throw new NotFoundException(`Disc with id ${id} not found`);
    }
  }

  async update(id: string, updateDiscDto: UpdateDiscDto) {
    // Sacamos genreId aparte
    const { genreId, ...restDto } = updateDiscDto;

    // Cargamos un parcial de disc con preload
    const disc = await this.discRepository.preload({
      id,
      ...restDto,
    });

    if (!disc) throw new NotFoundException(`Disc with id ${id} not found`);

    try {
      // Asignamos la relación manualmente
      if (genreId) {
        // Opción A: si no te interesa cargar la info del género,
        // basta con crear un objeto con su id.
        disc.genre = { id: genreId } as Genre;

        // Opción B: si quieres verificar que el género existe:
        // const genre = await this.genreRepository.findOneBy({ id: genreId });
        // if (!genre) throw new NotFoundException(`Genre with id ${genreId} not found`);
        // disc.genre = genre;
      }

      await this.discRepository.save(disc);
      return disc;
    } catch (error) {
      this.handleDbExceptions(error);
    }
  }

  async remove(id: string) {
    const result = await this.discRepository.delete({ id });
    if (result.affected === 0) {
      throw new NotFoundException(`Disc with id ${id} not found`);
    }
    return { message: `Disc with id ${id} has been removed` };
  }

  private handleDbExceptions(error: any) {
    if (error.code === '23505') throw new BadRequestException(error.detail);
    this.logger.error(error);
    throw new InternalServerErrorException('An unexpected error occurred');
  }
}
