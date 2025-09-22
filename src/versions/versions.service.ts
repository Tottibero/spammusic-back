// versions/versions.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Version } from './entities/version.entity';
import { VersionItem } from './entities/version-item.entity';
import { CreateVersionDto } from './dto/create-version.dto';
import { UpdateVersionDto } from './dto/update-version.dto';
import { CreateVersionItemDto } from './dto/create-version-item.dto';
import { UpdateVersionItemDto } from './dto/update-version-item.dto';
import { DevState } from './entities/version-item.entity';

@Injectable()
export class VersionsService {
  constructor(
    @InjectRepository(Version)
    private readonly versionsRepo: Repository<Version>,
    @InjectRepository(VersionItem)
    private readonly itemsRepo: Repository<VersionItem>,
  ) {}

  // ------- VERSION -------
  async create(dto: CreateVersionDto): Promise<Version> {
    const entity = this.versionsRepo.create({
      version: dto.version,
      releaseDate: dto.releaseDate ? new Date(dto.releaseDate) : undefined,
      notes: dto.notes,
      isActive: dto.isActive ?? false,
      publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : undefined,
      items: dto.items?.map((i) =>
        this.itemsRepo.create({
          type: i.type,
          description: i.description,
          scope: i.scope,
          breaking: i.breaking ?? false,
          publicVisible: i.publicVisible ?? false,
          state: i.state ?? DevState.TODO, // 👈 añadir
        }),
      ),
    });
    return this.versionsRepo.save(entity);
  }

  async findAll(): Promise<Version[]> {
    return this.versionsRepo.find({
      order: { releaseDate: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Version> {
    const entity = await this.versionsRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Version ${id} not found`);
    return entity;
  }

  async update(id: string, dto: UpdateVersionDto) {
    const v = await this.findOne(id);
    if (dto.version !== undefined) v.version = dto.version;
    if (dto.releaseDate !== undefined)
      v.releaseDate = dto.releaseDate ? new Date(dto.releaseDate) : null;
    if (dto.notes !== undefined) v.notes = dto.notes;
    if (dto.isActive !== undefined) v.isActive = dto.isActive;
    if (dto.publishedAt !== undefined)
      v.publishedAt = dto.publishedAt ? new Date(dto.publishedAt) : null;
    return this.versionsRepo.save(v);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.findOne(id);
    await this.versionsRepo.remove(existing);
  }

  // ------- NESTED ITEMS -------
  async listItems(versionId: string): Promise<VersionItem[]> {
    const version = await this.findOne(versionId); // valida que exista
    // Si 'items' es eager, ya viene cargado. Por si quitas eager, hacemos query explícita:
    return this.itemsRepo.find({ where: { version: { id: version.id } } });
  }

  async createItem(
    versionId: string,
    dto: CreateVersionItemDto,
  ): Promise<VersionItem> {
    const version = await this.findOne(versionId);
    const item = this.itemsRepo.create({
      type: dto.type,
      description: dto.description,
      scope: dto.scope,
      breaking: dto.breaking ?? false,
      publicVisible: dto.publicVisible ?? false,
      state: dto.state ?? DevState.TODO, // 👈 añadir
      version,
    });
    return this.itemsRepo.save(item);
  }

  async updateItem(
    versionId: string,
    itemId: string,
    dto: UpdateVersionItemDto,
  ): Promise<VersionItem> {
    // Asegura que el item pertenece a esa versión
    const item = await this.itemsRepo.findOne({
      where: { id: itemId, version: { id: versionId } },
      relations: ['version'], // por si necesitas version luego
    });
    if (!item)
      throw new NotFoundException(
        `Item ${itemId} not found in version ${versionId}`,
      );

    if (dto.type !== undefined) item.type = dto.type;
    if (dto.description !== undefined) item.description = dto.description;
    if (dto.scope !== undefined) item.scope = dto.scope;
    if (dto.breaking !== undefined) item.breaking = dto.breaking;
    if (dto.publicVisible !== undefined) item.publicVisible = dto.publicVisible;
    if (dto.state !== undefined) item.state = dto.state; // 👈 añadir

    return this.itemsRepo.save(item);
  }

  async removeItem(versionId: string, itemId: string): Promise<void> {
    const item = await this.itemsRepo.findOne({
      where: { id: itemId, version: { id: versionId } },
    });
    if (!item)
      throw new NotFoundException(
        `Item ${itemId} not found in version ${versionId}`,
      );
    await this.itemsRepo.remove(item);
  }

  async setActive(id: string, active: boolean) {
    const v = await this.findOne(id);
    v.isActive = active;
    if (active && !v.publishedAt) v.publishedAt = new Date();
    return this.versionsRepo.save(v);
  }

  async findPublic(): Promise<Version[]> {
    const all = await this.versionsRepo.find({
      where: { isActive: true },
      order: { publishedAt: 'DESC', releaseDate: 'DESC', createdAt: 'DESC' },
    });
    // filtra items no públicos en memoria (si mantienes eager); si quitas eager, hazlo en query
    return all.map((v) => ({
      ...v,
      items: v.items?.filter((i) => i.publicVisible) ?? [],
    })) as Version[];
  }
  // versions/versions.service.ts
  async findLatestPublic(): Promise<Version | null> {
    // Trae la última versión activa por publishedAt (y fallback por releaseDate/createdAt)
    const [latest] = await this.versionsRepo.find({
      where: { isActive: true },
      order: { publishedAt: 'DESC', releaseDate: 'DESC', createdAt: 'DESC' },
      take: 1,
    });

    if (!latest) return null;

    // Filtra items para mostrar solo los públicos
    latest.items = (latest.items ?? []).filter((i) => i.publicVisible);

    return latest;
  }
  // versions/versions.service.ts
  async findLatestDraft(): Promise<Version | null> {
    const draft = await this.versionsRepo.findOne({
      where: { publishedAt: null },
      order: { createdAt: 'DESC' },
      relations: ['items'],
    });
    return draft;
  }
}
