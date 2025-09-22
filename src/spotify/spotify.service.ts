import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Spotify } from './entities/spotify.entity';
import { CreateSpotifyDto } from './dto/create-spotify.dto';
import { UpdateSpotifyDto } from './dto/update-spotify.dto';

@Injectable()
export class SpotifyService {
  constructor(
    @InjectRepository(Spotify)
    private readonly repo: Repository<Spotify>,
  ) {}

  async create(createSpotifyDto: CreateSpotifyDto): Promise<Spotify> {
    const entity = this.repo.create({
      ...createSpotifyDto,
      // convertir string ISO8601 a Date
      fechaActualizacion: new Date(createSpotifyDto.fechaActualizacion),
    });

    return this.repo.save(entity);
  }

  async findAll(): Promise<Spotify[]> {
    return this.repo.find({
      order: { updatedAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Spotify> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException('Spotify no encontrado');
    }
    return entity;
  }

  async update(
    id: string,
    updateSpotifyDto: UpdateSpotifyDto,
  ): Promise<Spotify> {
    const entity = await this.findOne(id);

    // mezclar cambios; parsear fecha si viene
    Object.assign(entity, {
      ...updateSpotifyDto,
      ...(updateSpotifyDto.fechaActualizacion && {
        fechaActualizacion: new Date(updateSpotifyDto.fechaActualizacion),
      }),
    });

    return this.repo.save(entity);
  }

  async remove(id: string): Promise<{ ok: true }> {
    const entity = await this.findOne(id);
    await this.repo.remove(entity);
    return { ok: true };
  }
}
