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
      console.log(createRateDto.discId);
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

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;

    const [rates, totalItems] = await this.rateRepository.findAndCount({
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
      data: rates,
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
