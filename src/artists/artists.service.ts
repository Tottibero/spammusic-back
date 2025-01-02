import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateArtistDto } from './dto/create-artist.dto';
import { UpdateArtistDto } from './dto/update-artist.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Artist } from './entities/artist.entity';
import { Country } from 'src/countries/entities/country.entity';
import { PaginationDto } from '../common/dtos/pagination.dto';

@Injectable()
export class ArtistsService {
  private readonly logger = new Logger('ArtistService');

  constructor(
    @InjectRepository(Artist)
    private readonly artistRepository: Repository<Artist>,
  ) {}

  async create(createArtistDto: CreateArtistDto) {
    try {
      const artist = this.artistRepository.create(createArtistDto);
      await this.artistRepository.save(artist);
      return artist;
    } catch (error) {
      this.handleDbExceptions(error);
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;

    const [artists, totalItems] = await this.artistRepository.findAndCount({
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
      data: artists,
    };
  }

  async findOne(id: string): Promise<Artist> {
    try {
      const artist = await this.artistRepository.findOneByOrFail({
        id,
      });
      return artist;
    } catch (error) {
      throw new NotFoundException(`Artist with id ${id} not found`);
    }
  }

  async findByName(name: string): Promise<Artist[]> {
    if (!name) {
      throw new BadRequestException('Name parameter is required');
    }

    try {
      const artists = await this.artistRepository
        .createQueryBuilder('artist')
        .where('LOWER(artist.name) LIKE LOWER(:name)', {
          name: `%${name}%`,
        })
        .getMany();
      return artists;
    } catch (error) {
      this.handleDbExceptions(error);
    }
  }

  async update(id: string, updateArtistDto: UpdateArtistDto) {
    const artist = await this.artistRepository.preload({
      id,
      ...updateArtistDto,
    });

    if (!artist) throw new NotFoundException(`Artist with id ${id} not found`);

    try {
      await this.artistRepository.save(artist);
      return artist;
    } catch (error) {
      this.handleDbExceptions(error);
    }
  }

  async remove(id: string) {
    const artist = await this.artistRepository.delete({
      id,
    });
    return artist;
  }

  private handleDbExceptions(error: any) {
    if (error.code === '23505') throw new BadRequestException(error.detail);
    this.logger.error(error);
    throw new InternalServerErrorException('ayuda', error);
  }
}
