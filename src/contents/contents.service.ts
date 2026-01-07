import { Injectable, NotFoundException, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Content, ContentType } from './entities/content.entity';
import { User } from 'src/auth/entities/user.entity';
import { Reunion } from 'src/reunions/entities/reunion.entity';
import { Point } from 'src/points/entities/point.entity';
import { Spotify, SpotifyStatus, SpotifyType } from 'src/spotify/entities/spotify.entity';
import { Article, ArticleStatus, ArticleType } from 'src/articles/entities/article.entity';
import { ListsService } from 'src/lists/list.service';

@Injectable()
export class ContentsService {
  constructor(
    @InjectRepository(Content)
    private readonly contentRepo: Repository<Content>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Reunion)
    private readonly reunionRepo: Repository<Reunion>,
    @InjectRepository(Point)
    private readonly pointRepo: Repository<Point>,
    @InjectRepository(Spotify)
    private readonly spotifyRepo: Repository<Spotify>,
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
    @Inject(forwardRef(() => ListsService))
    private readonly listsService: ListsService,
  ) { }

  async create(createContentDto: CreateContentDto): Promise<Content> {
    const { authorId, publicationDate, closeDate, listDate, reunionId, ...rest } = createContentDto;

    // Verify user exists
    const author = await this.userRepo.findOne({ where: { id: authorId } });
    if (!author) {
      throw new NotFoundException(`User with id ${authorId} not found`);
    }

    // Verify reunion exists if provided
    if (reunionId) {
      const reunion = await this.reunionRepo.findOne({ where: { id: reunionId } });
      if (!reunion) {
        throw new NotFoundException(`Reunion with id ${reunionId} not found`);
      }
    }

    // If spotifyId is provided, fetch the entity to sync initial state (Import state from Entity to Content)
    if ((rest as any).spotifyId) {
      const existingSpotify = await this.spotifyRepo.findOne({ where: { id: (rest as any).spotifyId } });
      if (existingSpotify) {
        // If already PUBLISHED, sync content date from it
        if (existingSpotify.status === SpotifyStatus.PUBLICADA && existingSpotify.updateDate) {
          // Only override if content date wasn't explicitly provided? 
          // Or force sync? Usually if linking, we want consistency.
          if (!publicationDate) {
            (rest as any).publicationDate = existingSpotify.updateDate;
            createContentDto.publicationDate = existingSpotify.updateDate.toISOString(); // Update DTO for consistency
          }
        }
      }
    }

    // If articleId is provided, fetch the entity to sync initial state
    if ((rest as any).articleId) {
      const existingArticle = await this.articleRepo.findOne({ where: { id: (rest as any).articleId } });
      if (existingArticle) {
        if (existingArticle.status === ArticleStatus.PUBLISHED && existingArticle.updateDate) {
          if (!publicationDate) {
            (rest as any).publicationDate = existingArticle.updateDate;
            createContentDto.publicationDate = existingArticle.updateDate.toISOString();
          }
        }
      }
    }

    const content = this.contentRepo.create({
      ...rest,
      publicationDate: createContentDto.publicationDate ? new Date(createContentDto.publicationDate) : undefined,
      closeDate: closeDate ? new Date(closeDate) : undefined,
      listDate: listDate ? new Date(listDate) : undefined,
      author,
      reunionId,
      spotify: (rest as any).spotifyId ? { id: (rest as any).spotifyId } : undefined,
      article: (rest as any).articleId ? { id: (rest as any).articleId } : undefined,
    });

    // Auto-create Spotify entity if type is SPOTIFY and no spotifyId provided
    if (createContentDto.type === ContentType.SPOTIFY && !(rest as any).spotifyId) {
      if (!author) {
        throw new BadRequestException('Cannot auto-create Spotify entity without an assigned author.');
      }

      const spotifyEntity = this.spotifyRepo.create({
        name: rest.name,
        // Status before published: PARA_PUBLICAR. (Assuming user wants it ready to receive the date later)
        // Note: SpotifyService validation says PARA_PUBLICAR needs user. We have author here.
        status: SpotifyStatus.PARA_PUBLICAR,
        type: SpotifyType.GENERO, // Default type, user can change later
        link: '', // Default empty link
        updateDate: new Date(),
        user: author,
      });
      const savedSpotify = await this.spotifyRepo.save(spotifyEntity);

      content.spotify = savedSpotify;
      // content.spotifyId = savedSpotify.id; // If field existed directly
    }

    // Auto-create Article entity if type is ARTICLE and no articleId provided
    if (createContentDto.type === ContentType.ARTICLE && !(rest as any).articleId) {
      if (!author) {
        throw new BadRequestException('Cannot auto-create Article entity without an assigned author.');
      }

      const articleEntity = this.articleRepo.create({
        name: rest.name,
        // Status before published: READY
        status: ArticleStatus.READY,
        type: ArticleType.ARTICULO, // Default type
        updateDate: new Date(),
        user: author,
      });
      const savedArticle = await this.articleRepo.save(articleEntity);

      content.article = savedArticle;
    }

    // Auto-create Reunion if type is REUNION
    if (createContentDto.type === ContentType.REUNION) {
      const reunionDate = content.publicationDate || new Date();
      const reunionTitle = content.name;

      const reunion = this.reunionRepo.create({
        title: reunionTitle,
        date: reunionDate,
      });
      const savedReunion = await this.reunionRepo.save(reunion);

      content.reunion = savedReunion;
      content.reunionId = savedReunion.id;

      // Create default points
      const points = [
        {
          titulo: 'Asignar Radar semanal',
          content: '',
          done: false,
          reunion: savedReunion,
        },
        {
          titulo: 'Crónicas y artículos pendientes',
          content: '',
          done: false,
          reunion: savedReunion,
        },
      ];
      await this.pointRepo.save(points);
    }

    const savedContent = await this.contentRepo.save(content);

    // Auto-create Weekly List if type is RADAR or BEST
    if (savedContent.type === ContentType.RADAR) {
      const list = await this.listsService.createWeeklyList(savedContent.publicationDate, savedContent.listDate, savedContent.closeDate);
      savedContent.list = list;
      await this.contentRepo.save(savedContent);
    } else if (savedContent.type === ContentType.BEST) {
      const list = await this.listsService.createMonthlyList(savedContent.publicationDate, savedContent.listDate, savedContent.closeDate);
      savedContent.list = list;
      await this.contentRepo.save(savedContent);
    } else if (savedContent.type === ContentType.VIDEO) {
      const list = await this.listsService.createVideoList(savedContent.publicationDate, savedContent.listDate, savedContent.name, savedContent.closeDate);
      savedContent.list = list;
      await this.contentRepo.save(savedContent);
    }

    return savedContent;
  }

  async findAll(): Promise<Content[]> {
    return this.contentRepo.find({
      relations: ['author', 'list', 'list.asignations', 'spotify', 'article'],
      order: { publicationDate: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Content> {
    const content = await this.contentRepo.findOne({
      where: { id },
      relations: ['author', 'list', 'spotify', 'article'],
    });

    if (!content) {
      throw new NotFoundException(`Content with id ${id} not found`);
    }

    return content;
  }

  async update(id: string, updateContentDto: UpdateContentDto): Promise<Content> {
    const content = await this.findOne(id);

    const { authorId, publicationDate, closeDate, listDate, reunionId, ...rest } = updateContentDto;

    // Update author if provided
    if (authorId !== undefined) {
      const author = await this.userRepo.findOne({ where: { id: authorId } });
      if (!author) {
        throw new NotFoundException(`User with id ${authorId} not found`);
      }
      content.author = author;
    }

    // Update reunion if provided
    if (reunionId !== undefined) {
      if (reunionId === null) {
        content.reunionId = null;
      } else {
        const reunion = await this.reunionRepo.findOne({ where: { id: reunionId } });
        if (!reunion) {
          throw new NotFoundException(`Reunion with id ${reunionId} not found`);
        }
        content.reunionId = reunionId;
      }
    }

    // Update other fields
    Object.assign(content, rest);

    if (publicationDate !== undefined) {
      if ((publicationDate as unknown) instanceof Date) {
        content.publicationDate = publicationDate as unknown as Date;
      } else {
        content.publicationDate = publicationDate && typeof publicationDate === 'string' && publicationDate.trim() !== ''
          ? new Date(publicationDate)
          : null;
      }
    }

    if (closeDate !== undefined) {
      if ((closeDate as unknown) instanceof Date) {
        content.closeDate = closeDate as unknown as Date;
      } else {
        content.closeDate = closeDate && typeof closeDate === 'string' && closeDate.trim() !== ''
          ? new Date(closeDate)
          : null;
      }
    }

    if (listDate !== undefined) {
      if ((listDate as unknown) instanceof Date) {
        content.listDate = listDate as unknown as Date;
      } else {
        content.listDate = listDate && typeof listDate === 'string' && listDate.trim() !== ''
          ? new Date(listDate)
          : null;
      }
    }

    const savedContent = await this.contentRepo.save(content);

    // Sync with List (RADAR, BEST, VIDEO)
    if (savedContent.type === ContentType.RADAR || savedContent.type === ContentType.BEST || savedContent.type === ContentType.VIDEO) {
      const contentWithList = await this.contentRepo.findOne({
        where: { id: savedContent.id },
        relations: ['list']
      });

      if (contentWithList && contentWithList.list) {
        let listChanged = false;

        // Sync publicationDate -> releaseDate (NOT listDate - listDate is independent)
        if (contentWithList.publicationDate) {
          const contentDate = new Date(contentWithList.publicationDate);
          const releaseDate = contentWithList.list.releaseDate ? new Date(contentWithList.list.releaseDate) : null;

          if (!releaseDate || releaseDate.getTime() !== contentDate.getTime()) {
            contentWithList.list.releaseDate = contentDate;
            listChanged = true;
          }
        }

        // Sync content.listDate -> list.listDate (for RADAR, BEST, and VIDEO)
        if (savedContent.type === ContentType.RADAR || savedContent.type === ContentType.BEST || savedContent.type === ContentType.VIDEO) {
          if (contentWithList.listDate) {
            const contentListDate = new Date(contentWithList.listDate);
            const listListDate = contentWithList.list.listDate ? new Date(contentWithList.list.listDate) : null;

            if (!listListDate || listListDate.getTime() !== contentListDate.getTime()) {
              contentWithList.list.listDate = contentListDate;
              listChanged = true;
            }
          }
        }

        // Sync closeDate -> closeDate
        if (contentWithList.closeDate) {
          const contentCloseDate = new Date(contentWithList.closeDate);
          const listCloseDate = contentWithList.list.closeDate ? new Date(contentWithList.list.closeDate) : null;

          if (!listCloseDate || listCloseDate.getTime() !== contentCloseDate.getTime()) {
            contentWithList.list.closeDate = contentCloseDate;
            listChanged = true;
          }
        }

        if (listChanged) {
          // Use update on ListsService. 
          // Note: ListsService.update triggers Content sync back. ListsService uses updated content values so it should be fine.
          // But to be safe and avoid loops just save repo if possible, but ListsService.update is safer for abstraction.
          // The loop is broken because values will match.
          // Cast list to any to satisfy UpdateListDto
          await this.listsService.update(contentWithList.list.id, contentWithList.list as any);
        }
      }
    }

    // Sync with Spotify
    if (savedContent.type === ContentType.SPOTIFY) {
      // Ensure we have the relation
      const contentWithSpotify = savedContent.spotify
        ? savedContent
        : await this.contentRepo.findOne({ where: { id: savedContent.id }, relations: ['spotify'] });

      if (contentWithSpotify && contentWithSpotify.spotify) {
        const spotifyEntity = await this.spotifyRepo.findOne({ where: { id: contentWithSpotify.spotify.id } });

        if (spotifyEntity) {
          let spotifyChanged = false;

          if (savedContent.publicationDate) {
            // Content Published -> Spotify PUBLICADA + Date Sync
            const contentDate = new Date(savedContent.publicationDate);
            const spotifyDate = spotifyEntity.updateDate ? new Date(spotifyEntity.updateDate) : null;

            // Sync Date (ignoring time component discrepancies if we want to be strict, but updating to latest content date usually implies intention)
            // If the dates are completely different days, definitely update. 
            // If spotifyDate is timestamp, contentDate is YYYY-MM-DD 00:00:00.
            if (!spotifyDate || spotifyDate.getTime() !== contentDate.getTime()) {
              spotifyEntity.updateDate = contentDate;
              spotifyChanged = true;
            }

            if (spotifyEntity.status !== SpotifyStatus.PUBLICADA) {
              spotifyEntity.status = SpotifyStatus.PUBLICADA;
              spotifyChanged = true;
            }
          } else {
            // Content Backlog (null date) -> Spotify PARA_PUBLICAR
            if (spotifyEntity.status !== SpotifyStatus.PARA_PUBLICAR) {
              // If it was PUBLISHED, and we remove date, it goes to PARA_PUBLICAR.
              // Assuming it has user assigned (which strictly it should if it was PUBLISHED or PARA_PUBLICAR before).
              spotifyEntity.status = SpotifyStatus.PARA_PUBLICAR;
              spotifyChanged = true;
            }
          }

          if (spotifyChanged) {
            await this.spotifyRepo.save(spotifyEntity);
          }
        }
      }
    }

    // Sync with Article
    if (savedContent.type === ContentType.ARTICLE) {
      const contentWithArticle = savedContent.article
        ? savedContent
        : await this.contentRepo.findOne({ where: { id: savedContent.id }, relations: ['article'] });

      if (contentWithArticle && contentWithArticle.article) {
        const articleEntity = await this.articleRepo.findOne({ where: { id: contentWithArticle.article.id } });

        if (articleEntity) {
          let articleChanged = false;

          if (savedContent.publicationDate) {
            // Content Published -> Article PUBLISHED + Date Sync
            const contentDate = new Date(savedContent.publicationDate);
            const articleDate = articleEntity.updateDate ? new Date(articleEntity.updateDate) : null;

            if (!articleDate || articleDate.getTime() !== contentDate.getTime()) {
              articleEntity.updateDate = contentDate;
              articleChanged = true;
            }

            if (articleEntity.status !== ArticleStatus.PUBLISHED) {
              articleEntity.status = ArticleStatus.PUBLISHED;
              articleChanged = true;
            }
          } else {
            // Content Backlog (null date) -> Article READY (or whatever state maps to PARA_PUBLICAR for articles)
            if (articleEntity.status !== ArticleStatus.READY) {
              articleEntity.status = ArticleStatus.READY;
              articleChanged = true;
            }
          }

          if (articleChanged) {
            await this.articleRepo.save(articleEntity);
          }
        }
      }
    }

    return savedContent;
  }

  async remove(id: string): Promise<void> {
    const content = await this.contentRepo.findOne({
      where: { id },
      relations: ['list', 'reunion', 'spotify', 'article']
    });

    if (!content) {
      throw new NotFoundException(`Content with id ${id} not found`);
    }

    await this.contentRepo.remove(content);

    if (content.list) {
      await this.listsService.removeList(content.list.id);
    }

    if (content.reunion) {
      await this.reunionRepo.delete(content.reunion.id);
    }

    // Cleanup orphaned Spotify or Article entities if needed. 
    if (content.spotify) {
      await this.spotifyRepo.remove(content.spotify);
    }
    if (content.article) {
      await this.articleRepo.remove(content.article);
    }
  }

  async findByMonth(year: number, month: number): Promise<Content[]> {
    // Get the first day of the month
    const firstDayOfMonth = new Date(year, month - 1, 1);
    // Get the last day of the month
    const lastDayOfMonth = new Date(year, month, 0);

    // Extend to include the week before (7 days before first day)
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - 7);

    // Extend to include the week after (7 days after last day)
    const endDate = new Date(lastDayOfMonth);
    endDate.setDate(endDate.getDate() + 7);

    return this.contentRepo
      .createQueryBuilder('content')
      .leftJoinAndSelect('content.author', 'author')
      .leftJoinAndSelect('content.list', 'list')
      .leftJoinAndSelect('list.asignations', 'asignations')
      .leftJoinAndSelect('content.spotify', 'spotify')
      .leftJoinAndSelect('content.article', 'article')
      .where('content.publicationDate >= :startDate', { startDate })
      .andWhere('content.publicationDate <= :endDate', { endDate })
      .orderBy('content.publicationDate', 'DESC')
      .getMany();
  }

  async findOneBySpotifyId(spotifyId: string): Promise<Content | null> {
    return this.contentRepo.findOne({
      where: { spotify: { id: spotifyId } },
    });
  }

  async findOneByArticleId(articleId: string): Promise<Content | null> {
    return this.contentRepo.findOne({
      where: { article: { id: articleId } },
    });
  }

  async getDefaultAuthorId(): Promise<string> {
    const author = await this.userRepo.findOne({ select: ['id'], where: {}, order: { id: 'ASC' } });
    if (!author) {
      throw new NotFoundException('No default user found');
    }
    return author.id;
  }
}
