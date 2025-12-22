import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, LessThanOrEqual, MoreThanOrEqual, Repository, In } from 'typeorm';
import { Spotify, SpotifyStatus as SpotifyStatusEnum } from './entities/spotify.entity';
import { ContentsService } from 'src/contents/contents.service';
import { ContentType } from 'src/contents/entities/content.entity';
import { CreateSpotifyDto } from './dto/create-spotify.dto';
import { UpdateSpotifyDto } from './dto/update-spotify.dto';

// si ya tienes estos tipos en otro archivo, reutilízalos
export type SpotifyStatus =
  | 'actualizada'
  | 'publicada'
  | 'para_publicar'
  | 'por_actualizar'
  | 'en_desarrollo';

export type SpotifyType = 'festival' | 'especial' | 'genero' | 'otras';

export interface FindSpotifyParams {
  limit?: number;
  offset?: number;
  q?: string; // busca en nombre/enlace (ILIKE)
  status?: SpotifyStatus;
  type?: SpotifyType | SpotifyType[];
  // opcional: filtros por rango de fechaActualizacion (ISO)
  desde?: string; // >= fechaActualizacion
  hasta?: string; // <= fechaActualizacion
}

@Injectable()
export class SpotifyService {
  constructor(
    @InjectRepository(Spotify)
    private readonly repo: Repository<Spotify>,
    private readonly contentsService: ContentsService,
  ) { }

  async create(createSpotifyDto: CreateSpotifyDto): Promise<Spotify> {
    const entity = this.repo.create({
      ...createSpotifyDto,
      updateDate: new Date(createSpotifyDto.updateDate),
      user: createSpotifyDto.userId ? { id: createSpotifyDto.userId } : undefined,
    });
    return this.repo.save(entity);
  }

  async findAll(params: FindSpotifyParams = {}): Promise<Spotify[]> {
    const { limit = 50, offset = 0, q, status, type, desde, hasta } = params;

    // where base (AND)
    const baseWhere: any = {
      ...(status ? { status } : {}),
      ...(type ? (Array.isArray(type) ? { type: In(type) } : { type }) : {}),
      ...(desde
        ? { updateDate: MoreThanOrEqual(new Date(desde)) }
        : {}),
      ...(hasta
        ? { updateDate: LessThanOrEqual(new Date(hasta)) }
        : {}),
    };

    // Si hay q, hacemos OR sobre nombre/enlace con ILIKE
    const where = q
      ? [
        { ...baseWhere, name: ILike(`%${q}%`) },
        { ...baseWhere, link: ILike(`%${q}%`) },
      ]
      : baseWhere;

    return this.repo.find({
      where,
      order: { updatedAt: 'DESC' },
      take: Math.min(Math.max(0, limit), 200), // cap de seguridad
      skip: Math.max(0, offset),
      relations: ['user'],
    });
  }

  async findOne(id: string): Promise<Spotify> {
    const entity = await this.repo.findOne({
      where: { id },
      relations: ['user'], // Load user relation
    });
    if (!entity) throw new NotFoundException('Spotify item not found');
    return entity;
  }

  async update(
    id: string,
    updateSpotifyDto: UpdateSpotifyDto,
  ): Promise<Spotify> {
    const entity = await this.findOne(id);
    let shouldSyncContent = false;
    let contentSyncPayload: any = {};
    let contentId: string | undefined;

    // Update simple fields
    if (updateSpotifyDto.name) entity.name = updateSpotifyDto.name;
    if (updateSpotifyDto.link) entity.link = updateSpotifyDto.link;
    if (updateSpotifyDto.type) entity.type = updateSpotifyDto.type;
    if (updateSpotifyDto.updateDate) {
      entity.updateDate = new Date(updateSpotifyDto.updateDate);
      // Scheduled sync
      shouldSyncContent = true;
      contentSyncPayload.publicationDate = entity.updateDate;
    }

    // Handle User Assignment
    if (updateSpotifyDto.userId) {
      entity.user = { id: updateSpotifyDto.userId } as any;
    }

    // Logic for State Transitions
    if (updateSpotifyDto.status && updateSpotifyDto.status !== entity.status) {
      if (updateSpotifyDto.status === SpotifyStatusEnum.PARA_PUBLICAR) {
        const assignedUser = entity.user;
        if (!assignedUser) {
          throw new BadRequestException('Para cambiar el estado a "Para Publicar", la lista de Spotify debe tener un usuario asignado.');
        }

        const content = await this.contentsService.findOneBySpotifyId(id);
        if (!content) {
          try {
            await this.contentsService.create({
              name: entity.name,
              type: ContentType.SPOTIFY,
              authorId: assignedUser.id,
              spotifyId: id,
            } as any);
          } catch (error) {
            console.error('Error creating content for Spotify:', error);
            throw new BadRequestException('Error al crear el contenido asociado: ' + error.message);
          }
        } else {
          // Sync existing content to NULL date
          shouldSyncContent = true;
          contentId = content.id;
          contentSyncPayload.publicationDate = null;
        }
      } else if (updateSpotifyDto.status === SpotifyStatusEnum.PUBLICADA) {
        // Transition to PUBLICADA: Set fechaActualizacion to NOW
        entity.updateDate = new Date();
        shouldSyncContent = true;
        contentSyncPayload.publicationDate = entity.updateDate;
      }
    }

    // Apply state change
    if (updateSpotifyDto.status) entity.status = updateSpotifyDto.status;

    // Save Spotify Entity FIRST
    await this.repo.save(entity);

    // Sync Content if needed
    if (shouldSyncContent) {
      if (!contentId) {
        const content = await this.contentsService.findOneBySpotifyId(id);
        if (content) contentId = content.id;
      }

      if (contentId) {
        await this.contentsService.update(contentId, contentSyncPayload);
      }
    }

    // Return the full entity
    return this.findOne(id);
  }

  async remove(id: string): Promise<{ ok: true }> {
    const entity = await this.findOne(id);
    await this.repo.remove(entity);
    return { ok: true };
  }
}
