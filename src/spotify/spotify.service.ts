import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { Spotify } from './entities/spotify.entity';
import { CreateSpotifyDto } from './dto/create-spotify.dto';
import { UpdateSpotifyDto } from './dto/update-spotify.dto';

// si ya tienes estos tipos en otro archivo, reutilízalos
export type SpotifyEstado =
  | 'actualizada'
  | 'publicada'
  | 'para_publicar'
  | 'por_actualizar'
  | 'en_desarrollo';

export type SpotifyTipo = 'festival' | 'especial' | 'genero' | 'otras';

export interface FindSpotifyParams {
  limit?: number;
  offset?: number;
  q?: string; // busca en nombre/enlace (ILIKE)
  estado?: SpotifyEstado;
  tipo?: SpotifyTipo;
  // opcional: filtros por rango de fechaActualizacion (ISO)
  desde?: string; // >= fechaActualizacion
  hasta?: string; // <= fechaActualizacion
}

@Injectable()
export class SpotifyService {
  constructor(
    @InjectRepository(Spotify)
    private readonly repo: Repository<Spotify>,
  ) {}

  async create(createSpotifyDto: CreateSpotifyDto): Promise<Spotify> {
    const entity = this.repo.create({
      ...createSpotifyDto,
      fechaActualizacion: new Date(createSpotifyDto.fechaActualizacion),
    });
    return this.repo.save(entity);
  }

  async findAll(params: FindSpotifyParams = {}): Promise<Spotify[]> {
    const { limit = 50, offset = 0, q, estado, tipo, desde, hasta } = params;

    // where base (AND)
    const baseWhere: any = {
      ...(estado ? { estado } : {}),
      ...(tipo ? { tipo } : {}),
      ...(desde
        ? { fechaActualizacion: MoreThanOrEqual(new Date(desde)) }
        : {}),
      ...(hasta
        ? { fechaActualizacion: LessThanOrEqual(new Date(hasta)) }
        : {}),
    };

    // Si hay q, hacemos OR sobre nombre/enlace con ILIKE
    const where = q
      ? [
          { ...baseWhere, nombre: ILike(`%${q}%`) },
          { ...baseWhere, enlace: ILike(`%${q}%`) },
        ]
      : baseWhere;

    return this.repo.find({
      where,
      order: { updatedAt: 'DESC' },
      take: Math.min(Math.max(0, limit), 200), // cap de seguridad
      skip: Math.max(0, offset),
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
