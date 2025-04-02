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
import { Artist } from 'src/artists/entities/artist.entity';
import { Pending } from 'src/pendings/entities/pending.entity';
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
      .leftJoinAndSelect('disc.artist', 'artist')
      .leftJoinAndSelect('disc.genre', 'genre')
      .leftJoinAndSelect('disc.rates', 'rate', 'rate.userId = :userId', {
        userId,
      })
      .leftJoinAndSelect(
        'disc.favorites',
        'favorite',
        'favorite.userId = :userId',
        { userId },
      )
      .leftJoinAndSelect(
        'disc.pendings',
        'pending',
        'pending.userId = :userId',
        { userId },
      )
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
      }, 'averageCover')
      .addSelect((subQuery) => {
        return subQuery
          .select('COUNT(rate.id)', 'rateCount')
          .from('rate', 'rate')
          .where('rate.discId = disc.id AND rate.rate IS NOT NULL');
      }, 'rateCount')
      .where('disc.releaseDate <= :today', { today })
      // Agrega el conteo de comentarios para cada disco
      .addSelect((subQuery) => {
        return subQuery
          .select('COUNT(comment.id)', 'commentCount')
          .from('comment', 'comment')
          .where('comment.discId = disc.id');
      }, 'commentCount')
      .where('disc.releaseDate <= :today', { today });

    const totalItemsQueryBuilder = this.discRepository
      .createQueryBuilder('disc')
      .leftJoin('disc.artist', 'artist')
      .leftJoin('disc.genre', 'genre')
      .where('disc.releaseDate <= :today', { today });

    if (genre) {
      queryBuilder.andWhere('disc.genreId = :genre', { genre });
      totalItemsQueryBuilder.andWhere('disc.genreId = :genre', { genre });
    }

    if (query) {
      const search = `%${query}%`;
      queryBuilder.andWhere(
        '(disc.name ILIKE :search OR artist.name ILIKE :search)',
        { search },
      );
      totalItemsQueryBuilder.andWhere(
        '(disc.name ILIKE :search OR artist.name ILIKE :search)',
        { search },
      );
    }

    if (startDate && endDate) {
      queryBuilder.andWhere(
        'disc.releaseDate BETWEEN :startDate AND :endDate',
        {
          startDate,
          endDate,
        },
      );
      totalItemsQueryBuilder.andWhere(
        'disc.releaseDate BETWEEN :startDate AND :endDate',
        {
          startDate,
          endDate,
        },
      );
    }

    queryBuilder
      .take(limit)
      .skip(offset)
      .orderBy('disc.releaseDate', 'DESC') // Ordena por fecha de lanzamiento (descendente)
      .addOrderBy('artist.name', 'ASC'); // Luego ordena por nombre del artista (ascendente)

    const { entities: discs, raw } = await queryBuilder.getRawAndEntities();

    // Mapea los valores crudos de averageRate, averageCover y commentCount a las entidades
    const processedDiscs = discs.map((disc, index) => ({
      ...disc,
      userRate: disc.rates.length > 0 ? disc.rates[0] : null,
      averageRate: parseFloat(raw[index].averageRate) || null,
      averageCover: parseFloat(raw[index].averageCover) || null,
      commentCount: parseInt(raw[index].commentCount, 10) || 0,
      voteCount: parseInt(raw[index].rateCount, 10) || 0, // <-- Add rateCount here
      favoriteId: disc.favorites.length > 0 ? disc.favorites[0].id : null, // Enviar el ID del favorito si existe
      pendingId:
        disc.pendings && disc.pendings.length > 0 ? disc.pendings[0].id : null,
    }));

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
      .leftJoinAndSelect('disc.artist', 'artist')
      .leftJoinAndSelect('disc.genre', 'genre')
      .leftJoinAndSelect('disc.rates', 'rate', 'rate.userId = :userId', {
        userId,
      })
      .leftJoinAndSelect('disc.asignations', 'asignation')
      .leftJoinAndSelect('asignation.user', 'asignationUser')
      .leftJoinAndSelect('asignation.list', 'asignationList')
      .leftJoinAndSelect(
        'disc.favorites',
        'favorite',
        'favorite.userId = :userId',
        { userId },
      )
      .leftJoinAndSelect(
        'disc.pendings',
        'pending',
        'pending.userId = :userId',
        {
          userId,
        },
      );

    if (query) {
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
      const dateKey = new Date(disc.releaseDate).toISOString().split('T')[0];

      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }

      acc[dateKey].push({
        ...disc,
        userRate: disc.rates.length > 0 ? disc.rates[0] : null,
        favoriteId: disc.favorites.length > 0 ? disc.favorites[0].id : null, // Enviar el ID del favorito
        pendingId:
          disc.pendings && disc.pendings.length > 0
            ? disc.pendings[0].id
            : null,
        asignations: disc.asignations.map((asignation) => ({
          id: asignation.id,
          done: asignation.done,
          user: asignation.user,
          list: asignation.list,
        })),
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
    const { genreId, artistId, ...restDto } = updateDiscDto;

    // Cargamos un parcial de disc con preload
    const disc = await this.discRepository.preload({
      id,
      ...restDto,
    });

    if (!disc) throw new NotFoundException(`Disc with id ${id} not found`);

    try {
      if (genreId) {
        disc.genre = { id: genreId } as Genre;
      }

      if (artistId) {
        disc.artist = { id: artistId } as Artist;
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

  async findTopRatedOrFeaturedAndStats(
    paginationDto: PaginationDto,
    user: User,
  ): Promise<{
    discs: Disc[];
    totalDiscs: number;
    totalVotes: number;
    topUsersByRates: {
      user: { id: number; username: string };
      rateCount: number;
    }[];
    topUsersByCover: {
      user: { id: number; username: string };
      totalCover: number;
    }[];
    ratingDistribution: { rate: number; count: number }[];
  }> {
    const userId = user.id;
    const { dateRange } = paginationDto;

    // Parámetros y condición para la consulta principal (incluye userId)
    let dateCondition = '';
    const params: any[] = [userId]; // $1 será userId

    if (dateRange && dateRange.length === 2) {
      const [startDate, endDate] = dateRange;
      dateCondition = `WHERE d."releaseDate" BETWEEN $2 AND $3`;
      params.push(new Date(startDate));
      params.push(new Date(endDate));
    }

    // --- Cálculo de estadísticas globales con filtro de fecha ---
    // Para la consulta global no necesitamos el userId, así que definimos sus propios parámetros
    let dateConditionGlobal = '';
    const globalStatsParams: any[] = [];
    if (dateRange && dateRange.length === 2) {
      const [startDate, endDate] = dateRange;
      dateConditionGlobal = `WHERE d."releaseDate" BETWEEN $1 AND $2`;
      globalStatsParams.push(new Date(startDate));
      globalStatsParams.push(new Date(endDate));
    }

    const globalStatsQuery = `
      SELECT 
        AVG(avgRates) AS "globalAvgRate",
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY voteCount) AS "medianVotes"
      FROM (
        SELECT 
          d.id, 
          COUNT(CASE WHEN r.rate IS NOT NULL THEN 1 END) AS voteCount,
          COALESCE(AVG(r.rate), 0) AS avgRates
        FROM disc d
        LEFT JOIN rate r ON d.id = r."discId"
        ${dateConditionGlobal}
        GROUP BY d.id
      ) AS rate_stats;
    `;
    const globalStatsResult = await this.discRepository.query(
      globalStatsQuery,
      globalStatsParams,
    );
    const { globalAvgRate: globalAvgRateStr, medianVotes: medianVotesStr } =
      globalStatsResult[0] || {};
    const globalAvgRate = parseFloat(globalAvgRateStr) || 0;
    const medianVotes = parseInt(medianVotesStr, 10) || 1;

    // --- Consulta principal de discos (ordenados por featured y weightedScore) ---
    const query = `
      SELECT 
        d.*, 
        a.name AS "artistName", 
        g.name AS "genreName", 
        g.color AS "genreColor", 
        COUNT(r.id) AS "voteCount", 
        COALESCE(AVG(r.rate), 0) AS "averageRate", 
        COALESCE(AVG(r.cover), 0) AS "averageCover",
        (SELECT r.id FROM rate r WHERE r."discId" = d.id AND r."userId" = $1 LIMIT 1) AS "userRateId",
        (SELECT f.id FROM favorite f WHERE f."discId" = d.id AND f."userId" = $1 LIMIT 1) AS "userFavoriteId",
        (SELECT p.id FROM pending p WHERE p."discId" = d.id AND p."userId" = $1 LIMIT 1) AS "pendingId",
        (SELECT r.rate FROM rate r WHERE r."discId" = d.id AND r."userId" = $1 LIMIT 1) AS "userRate",
        (SELECT r.cover FROM rate r WHERE r."discId" = d.id AND r."userId" = $1 LIMIT 1) AS "userCover",
        (SELECT COUNT(c.id) FROM comment c WHERE c."discId" = d.id) AS "commentCount",
        (
          (COALESCE(AVG(r.rate), 0) * COUNT(r.id)) 
          + (${globalAvgRate} * ${medianVotes})
        ) / (COUNT(r.id) + ${medianVotes}) AS "weightedScore"
      FROM disc d
      LEFT JOIN artist a ON d."artistId" = a.id
      LEFT JOIN genre g ON d."genreId" = g.id
      LEFT JOIN rate r ON d.id = r."discId"
      LEFT JOIN favorite f ON f."discId" = d.id AND f."userId" = $1
      LEFT JOIN pending p ON p."discId" = d.id AND p."userId" = $1
      ${dateCondition}
      GROUP BY d.id, a.name, g.name, g.color, f.id
      ORDER BY "weightedScore" DESC
      LIMIT 20;
    `;

    const topRatedDiscs = await this.discRepository.query(query, params);

    // --- Otras estadísticas: total de discos y total de votos ---
    const totalDiscs = await this.discRepository.count();
    const totalVotesResult = await this.discRepository
      .createQueryBuilder('disc')
      .leftJoin('disc.rates', 'rates')
      .select('COUNT(*)', 'totalVotes')
      .where('rates.rate IS NOT NULL')
      .getRawOne();
    const totalVotes = parseInt(totalVotesResult.totalVotes, 10) || 0;

    // --- Consulta para obtener los top usuarios por cantidad de rates ---
    const topUsersByRatesQuery = `
      SELECT u.id AS "userId", u.username, COUNT(r.id) AS "rateCount"
      FROM rate r
      JOIN "users" u ON u.id = r."userId"
      WHERE r.rate IS NOT NULL
      GROUP BY u.id, u.username
      ORDER BY "rateCount" DESC
      LIMIT 3;
    `;
    const topUsersByRates =
      await this.discRepository.query(topUsersByRatesQuery);

    // --- Consulta para obtener los top usuarios por cover ---
    const topUsersByCoverQuery = `
      SELECT u.id AS "userId", u.username, COUNT(r.id) AS "coverCount"
      FROM rate r
      JOIN "users" u ON u.id = r."userId"
      WHERE r.cover IS NOT NULL
      GROUP BY u.id, u.username
      ORDER BY "coverCount" DESC
      LIMIT 3;
    `;
    const topUsersByCover =
      await this.discRepository.query(topUsersByCoverQuery);

    // --- Consulta: Distribución de ratings ---
    const ratingDistributionQuery = `
      SELECT r.rate AS "rateValue", COUNT(*) AS "count"
      FROM rate r
      WHERE r.rate IS NOT NULL
      GROUP BY r.rate
      ORDER BY r.rate;
    `;
    const ratingDistributionResult = await this.discRepository.query(
      ratingDistributionQuery,
    );
    const ratingDistribution = ratingDistributionResult.map((row: any) => ({
      rate: parseFloat(row.rateValue),
      count: parseInt(row.count, 10),
    }));

    // --- Transformación de los datos para el formato esperado ---
    const processedDiscs = topRatedDiscs.map((disc: any) => ({
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
      favoriteId: disc.userFavoriteId || null,
      pendingId: disc.pendingId || null,
      averageRate: disc.averageRate !== null ? parseFloat(disc.averageRate) : 0,
      averageCover:
        disc.averageCover !== null ? parseFloat(disc.averageCover) : 0,
      voteCount: parseInt(disc.voteCount, 10) || 0,
      commentCount: parseInt(disc.commentCount, 10) || 0,
    }));

    return {
      discs: processedDiscs,
      totalDiscs,
      totalVotes,
      topUsersByRates: topUsersByRates.map((row: any) => ({
        user: {
          id: row.userId,
          username: row.username,
        },
        rateCount: parseInt(row.rateCount, 10),
      })),
      topUsersByCover: topUsersByCover.map((row: any) => ({
        user: {
          id: row.userId,
          username: row.username,
        },
        totalCover: parseInt(row.coverCount, 10),
      })),
      ratingDistribution,
    };
  }

  private handleDbExceptions(error: any) {
    if (error.code === '23505') throw new BadRequestException(error.detail);
    this.logger.error(error);
    throw new InternalServerErrorException('An unexpected error occurred');
  }
}
