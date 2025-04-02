import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateAsignationDto } from './dto/create-asignations.dto';
import { UpdateAsignationDto } from './dto/update-asignations.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asignation } from './entities/asignations.entity';
import { PaginationDto } from '../common/dtos/pagination.dto';
import { List } from 'src/lists/entities/list.entity';
import { User } from 'src/auth/entities/user.entity';
import { Disc } from 'src/discs/entities/disc.entity';

@Injectable()
export class AsignationsService {
  private readonly logger = new Logger('AsignationsService');

  constructor(
    @InjectRepository(Asignation)
    private readonly asignationRepository: Repository<Asignation>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Disc)
    private readonly discRepository: Repository<Disc>,

    @InjectRepository(List)
    private readonly listRepository: Repository<List>,

    // private readonly discRespository: Repository<Disc>,
  ) {}

  async create(createAsignationDto: CreateAsignationDto) {
    const { userId, discId, listId, ...rest } = createAsignationDto;

    try {
      // Buscar las entidades relacionadas
      const user = await this.userRepository.findOneBy({ id: userId });
      if (!user) throw new Error('User not found');

      const disc = await this.discRepository.findOneBy({ id: discId });
      if (!disc) throw new Error('Disc not found');

      const list = await this.listRepository.findOneBy({ id: listId });
      if (!list) throw new Error('List not found');

      // Crear la asignación y asignar las relaciones
      const asignation = this.asignationRepository.create({
        ...rest,
        user,
        disc,
        list,
      });

      // Guardar la asignación en la base de datos
      await this.asignationRepository.save(asignation);

      return asignation;
    } catch (error) {
      this.handleDbExceptions(error);
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;

    const [asignations, totalItems] =
      await this.asignationRepository.findAndCount({
        take: limit,
        skip: offset,
      });

    const totalPages = Math.ceil(totalItems / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return {
      totalItems,
      totalPages,
      currentPage,
      limit,
      data: asignations,
    };
  }

  async findOne(id: string): Promise<Asignation> {
    try {
      const asignation = await this.asignationRepository.findOneByOrFail({
        id,
      });
      return asignation;
    } catch (error) {
      throw new NotFoundException(`Asignation with id ${id} not found`);
    }
  }

  async update(id: string, updateAsignationDto: UpdateAsignationDto) {
    // Sacamos genreId aparte
    const { userId, ...restDto } = updateAsignationDto;

    // Cargamos un parcial de disc con preload
    const asignation = await this.asignationRepository.preload({
      id,
      ...restDto,
    });

    if (!asignation)
      throw new NotFoundException(`Asignation with id ${id} not found`);

    try {
      // Asignamos la relación manualmente
      if (userId) {
        // Opción A: si no te interesa cargar la info del género,
        // basta con crear un objeto con su id.
        asignation.user = { id: userId } as User;

        // Opción B: si quieres verificar que el género existe:
        // const genre = await this.genreRepository.findOneBy({ id: genreId });
        // if (!genre) throw new NotFoundException(`Genre with id ${genreId} not found`);
        // disc.genre = genre;
      }

      await this.asignationRepository.save(asignation);
      return asignation;
    } catch (error) {
      this.handleDbExceptions(error);
    }
  }

  async remove(id: string) {
    const result = await this.asignationRepository.delete({ id });
    if (result.affected === 0) {
      throw new NotFoundException(`Asignation with id ${id} not found`);
    }
    return { message: `Asignation with id ${id} has been removed` };
  }

  private handleDbExceptions(error: any) {
    // Ej. error.code === '23505' en postgres para entradas duplicadas
    if (error.code === '23505') {
      throw new BadRequestException(error.detail);
    }
    this.logger.error(error);
    throw new InternalServerErrorException('An unexpected error occurred');
  }

  async findByListId(listId: string, paginationDto: PaginationDto) {
    const { limit = 100, offset = 0 } = paginationDto;

    try {
      const queryBuilder = this.asignationRepository
        .createQueryBuilder('asignation')
        .leftJoinAndSelect('asignation.user', 'user')
        .leftJoinAndSelect('asignation.disc', 'disc')
        .leftJoinAndSelect('asignation.list', 'list')
        .where('list.id = :listId', { listId })
        // Ajustar la columna a ordenar según tu User Entity
        .orderBy('user.username', 'ASC')
        .skip(offset)
        .take(limit);

      const [asignations, totalItems] = await queryBuilder.getManyAndCount();

      const totalPages = Math.ceil(totalItems / limit);
      const currentPage = Math.floor(offset / limit) + 1;

      return {
        totalItems,
        totalPages,
        currentPage,
        limit,
        data: asignations,
      };
    } catch (error) {
      this.logger.error(
        `Error finding asignations for listId ${listId}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve asignations by listId',
      );
    }
  }
}
