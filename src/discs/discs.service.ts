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
import { Between, LessThanOrEqual, Repository } from 'typeorm';
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
    const { limit = 10, offset = 0, query, dateRange, genre } = paginationDto;
    const userId = user.id;

    const today = new Date();

    // Calcula el rango de fechas si se especifica el mes
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    if (dateRange && dateRange.length === 2) {
      [startDate, endDate] = dateRange; // Extrae las fechas directamente del array
    }

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
      .where('disc.releaseDate <= :today', { today });

    // Aplica el filtro de mes si está definido
    if (startDate && endDate) {
      queryBuilder.andWhere(
        'disc.releaseDate BETWEEN :startDate AND :endDate',
        {
          startDate,
          endDate,
        },
      );
    }

    if (query) {
      const search = `%${query}%`;
      queryBuilder.andWhere(
        '(disc.name ILIKE :search OR artist.name ILIKE :search)',
        { search },
      );
    }

    if (genre) {
      queryBuilder.andWhere('disc.genreId = :genre', { genre });
    }

    queryBuilder
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

    const totalItemsQueryBuilder = this.discRepository
      .createQueryBuilder('disc')
      .leftJoin('disc.artist', 'artist') // Asegúrate de incluir las mismas uniones
      .leftJoin('disc.genre', 'genre') // Incluye también otras relaciones si se usan en los filtros
      .where('disc.releaseDate <= :today', { today });

    if (startDate && endDate) {
      totalItemsQueryBuilder.andWhere(
        'disc.releaseDate BETWEEN :startDate AND :endDate',
        {
          startDate,
          endDate,
        },
      );
    }

    if (query) {
      const search = `%${query}%`;
      totalItemsQueryBuilder.andWhere(
        '(disc.name ILIKE :search OR artist.name ILIKE :search)',
        { search },
      );
    }

    const totalItems = await totalItemsQueryBuilder.getCount();
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
    const { limit = 10, offset = 0, query, dateRange } = paginationDto;

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
      .leftJoinAndSelect('disc.asignations', 'asignation') // Incluye las asignaciones
      .leftJoinAndSelect('asignation.user', 'asignationUser') // Incluye información del usuario en asignaciones
      .leftJoinAndSelect('asignation.list', 'asignationList'); // Incluye información de la lista en asignaciones

    console.log('query', query);

    if (query) {
      console.log('query', query);
      const search = `%${query}%`;
      queryBuilder.andWhere(
        '(disc.name ILIKE :search OR artist.name ILIKE :search)',
        { search },
      );
    }

    if (dateRange && dateRange.length === 2) {
      const [startDate, endDate] = dateRange;
      queryBuilder.andWhere(
        'disc.releaseDate BETWEEN :startDate AND :endDate',
        {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        },
      );
    }

    queryBuilder
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
        asignations: disc.asignations.map((asignation) => ({
          id: asignation.id,
          done: asignation.done,
          user: asignation.user, // Información del usuario
          list: asignation.list, // Información de la lista
        })), // Incluye asignaciones
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

  async findTopRatedOrFeaturedAndStats(user: User): Promise<{
    discs: Disc[];
    totalDiscs: number;
    totalVotes: number;
  }> {
    const userId = user.id;

    // Consulta de estadísticas globales
    const globalStatsQuery = `
      SELECT 
        AVG(avgRates) AS globalAvgRate,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY voteCount) AS medianVotes
      FROM (
        SELECT 
          d.id, 
          COUNT(r.id) AS voteCount,
          COALESCE(AVG(r.rate), 0) AS avgRates
        FROM disc d
        LEFT JOIN rate r ON d.id = r."discId"
        GROUP BY d.id
      ) AS rate_stats;
    `;

    const { globalavgrate, medianvotes } =
      await this.discRepository.query(globalStatsQuery);
    const globalAvgRate = parseFloat(globalavgrate) || 0;
    const medianVotes = parseInt(medianvotes, 10) || 1;

    // Consulta principal con Weighted Score
    const query = `
      SELECT 
        d.*, 
        a.name AS "artistName", 
        g.name AS "genreName", 
        g.color AS "genreColor", 
        COUNT(r.id) AS voteCount, 
        COALESCE(AVG(r.rate), 0) AS "averageRate", 
        COALESCE(AVG(r.cover), 0) AS "averageCover", 
        (SELECT r.id FROM rate r WHERE r."discId" = d.id AND r."userId" = $1 LIMIT 1) AS "userRateId",
        (SELECT r.rate FROM rate r WHERE r."discId" = d.id AND r."userId" = $1 LIMIT 1) AS "userRate",
        (SELECT r.cover FROM rate r WHERE r."discId" = d.id AND r."userId" = $1 LIMIT 1) AS "userCover",
        ((COALESCE(AVG(r.rate), 0) * COUNT(r.id)) + (${globalAvgRate} * ${medianVotes})) / 
        (COUNT(r.id) + ${medianVotes}) AS weightedScore
      FROM disc d
      LEFT JOIN artist a ON d."artistId" = a.id
      LEFT JOIN genre g ON d."genreId" = g.id
      LEFT JOIN rate r ON d.id = r."discId"
      GROUP BY d.id, a.name, g.name, g.color
      ORDER BY d.featured DESC, weightedScore DESC 
      LIMIT 12;
    `;

    const topRatedDiscs = await this.discRepository.query(query, [userId]);

    // Obtener estadísticas adicionales
    const totalDiscs = await this.discRepository.count();
    const totalVotes = await this.discRepository
      .createQueryBuilder('disc')
      .leftJoin('disc.rates', 'rates')
      .select('COUNT(rates.id)', 'totalVotes')
      .getRawOne()
      .then((result) => parseInt(result.totalVotes, 10) || 0);

    // Transformar datos en el formato esperado
    const processedDiscs = topRatedDiscs.map((disc) => ({
      ...disc,
      artist: { name: disc.artistName },
      genre: { name: disc.genreName, color: disc.genreColor },
      userRate: disc.userRateId
        ? {
            id: disc.userRateId,
            rate: parseFloat(disc.userRate) || null,
            cover: parseFloat(disc.userCover) || null,
          }
        : null,
      averageRate: disc.averageRate !== null ? parseFloat(disc.averageRate) : 0, // 💡 Asegura que no sea `null`
      averageCover:
        disc.averageCover !== null ? parseFloat(disc.averageCover) : 0, // 💡 Asegura que no sea `null`
      voteCount: parseInt(disc.voteCount, 10) || 0,
    }));

    return {
      discs: processedDiscs,
      totalDiscs,
      totalVotes,
    };
  }

  private handleDbExceptions(error: any) {
    if (error.code === '23505') throw new BadRequestException(error.detail);
    this.logger.error(error);
    throw new InternalServerErrorException('An unexpected error occurred');
  }
}
