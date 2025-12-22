import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository, In } from 'typeorm';
import { Article, ArticleStatus } from './entities/article.entity';
import { ContentsService } from 'src/contents/contents.service';
import { ContentType } from 'src/contents/entities/content.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

export interface FindArticleParams {
    limit?: number;
    offset?: number;
    q?: string;
    status?: ArticleStatus;
    userId?: string;
}

@Injectable()
export class ArticlesService {
    constructor(
        @InjectRepository(Article)
        private readonly repo: Repository<Article>,
        @Inject(forwardRef(() => ContentsService))
        private readonly contentsService: ContentsService,
    ) { }

    async create(createArticleDto: CreateArticleDto): Promise<Article> {
        const entity = this.repo.create({
            ...createArticleDto,
            updateDate: createArticleDto.updateDate ? new Date(createArticleDto.updateDate) : null,
            user: createArticleDto.userId ? { id: createArticleDto.userId } : undefined,
        });
        return this.repo.save(entity);
    }

    async findAll(params: FindArticleParams = {}): Promise<Article[]> {
        const { limit = 50, offset = 0, q, status, userId } = params;

        const where: any = {};

        if (userId) {
            where.user = { id: userId };
        }

        if (status) {
            where.status = status;
        }

        if (q) {
            where.name = ILike(`%${q}%`);
        }

        return this.repo.find({
            where,
            order: { updatedAt: 'DESC' },
            take: Math.min(Math.max(0, limit), 200),
            skip: Math.max(0, offset),
            relations: ['user'],
        });
    }

    async findOne(id: string): Promise<Article> {
        const entity = await this.repo.findOne({
            where: { id },
            relations: ['user'],
        });
        if (!entity) throw new NotFoundException('Article not found');
        return entity;
    }

    async update(id: string, updateArticleDto: UpdateArticleDto): Promise<Article> {
        const entity = await this.findOne(id);
        let shouldSyncContent = false;
        let contentSyncPayload: any = {};
        let contentId: string | undefined;

        // Update simple fields
        if (updateArticleDto.name) entity.name = updateArticleDto.name;
        if (updateArticleDto.link) entity.link = updateArticleDto.link;
        if (updateArticleDto.type) entity.type = updateArticleDto.type;
        if (updateArticleDto.updateDate) {
            entity.updateDate = new Date(updateArticleDto.updateDate);
            shouldSyncContent = true;
            contentSyncPayload.publicationDate = entity.updateDate;
        }

        // Handle User Assignment
        if (updateArticleDto.userId) {
            entity.user = { id: updateArticleDto.userId } as any;
        }

        // Logic for State Transitions
        if (updateArticleDto.status && updateArticleDto.status !== entity.status) {

            if (updateArticleDto.status === ArticleStatus.READY) {

                const assignedUser = entity.user;
                if (!assignedUser) {
                    throw new BadRequestException('Para pasar a estado READY, el artículo debe tener un usuario asignado.');
                }

                const content = await this.contentsService.findOneByArticleId(id);
                if (!content) {
                    try {
                        await this.contentsService.create({
                            name: entity.name,
                            type: ContentType.ARTICLE,
                            authorId: assignedUser.id,
                            articleId: id,
                        } as any);
                    } catch (error) {
                        console.error('Error creating content for Article:', error);
                        throw new BadRequestException('Error al crear el contenido asociado: ' + error.message);
                    }
                } else {
                    shouldSyncContent = true;
                    contentId = content.id;
                    contentSyncPayload.publicationDate = null;
                }

            } else if (updateArticleDto.status === ArticleStatus.PUBLISHED) {
                entity.updateDate = new Date();
                shouldSyncContent = true;
                contentSyncPayload.publicationDate = entity.updateDate;
            }
        }

        if (updateArticleDto.status) entity.status = updateArticleDto.status;

        await this.repo.save(entity);

        if (shouldSyncContent) {
            if (!contentId) {
                const content = await this.contentsService.findOneByArticleId(id);
                if (content) contentId = content.id;
            }

            if (contentId) {
                await this.contentsService.update(contentId, contentSyncPayload);
            }
        }

        return this.findOne(id);
    }

    async remove(id: string): Promise<void> {
        const entity = await this.findOne(id);

        // Find associated content to delete it as well
        const content = await this.contentsService.findOneByArticleId(id);

        // First remove content (if it exists)
        if (content) {
            await this.contentsService.remove(content.id);
        } else {
            // If no content, just remove article
            await this.repo.remove(entity);
        }
    }
}
