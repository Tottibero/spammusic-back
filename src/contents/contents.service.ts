import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Content, ContentType } from './entities/content.entity';
import { User } from 'src/auth/entities/user.entity';
import { Reunion } from 'src/reunions/entities/reunion.entity';
import { Point } from 'src/points/entities/point.entity';
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
    @Inject(forwardRef(() => ListsService))
    private readonly listsService: ListsService,
  ) { }

  async create(createContentDto: CreateContentDto): Promise<Content> {
    const { authorId, publicationDate, closeDate, reunionId, ...rest } = createContentDto;

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

    const content = this.contentRepo.create({
      ...rest,
      publicationDate: publicationDate ? new Date(publicationDate) : undefined,
      closeDate: closeDate ? new Date(closeDate) : undefined,
      author,
      reunionId,
    });

    // Auto-create Reunion if type is MEETING
    if (createContentDto.type === ContentType.MEETING) {
      const reunionDate = content.publicationDate || new Date();
      const reunionTitle = content.name;

      const reunion = this.reunionRepo.create({
        titulo: reunionTitle,
        fecha: reunionDate,
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

    // Auto-create Weekly List if type is RADAR
    if (savedContent.type === ContentType.RADAR) {
      const list = await this.listsService.createWeeklyList(savedContent.publicationDate);
      savedContent.list = list;
      await this.contentRepo.save(savedContent);
    }

    return savedContent;
  }

  async findAll(): Promise<Content[]> {
    return this.contentRepo.find({
      relations: ['author'],
      order: { publicationDate: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Content> {
    const content = await this.contentRepo.findOne({
      where: { id },
      relations: ['author', 'list'],
    });

    if (!content) {
      throw new NotFoundException(`Content with id ${id} not found`);
    }

    return content;
  }

  async update(id: string, updateContentDto: UpdateContentDto): Promise<Content> {
    const content = await this.findOne(id);

    const { authorId, publicationDate, closeDate, reunionId, ...rest } = updateContentDto;

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
      content.publicationDate = publicationDate && publicationDate.trim() !== ''
        ? new Date(publicationDate)
        : null;
    }

    if (closeDate !== undefined) {
      content.closeDate = closeDate && closeDate.trim() !== ''
        ? new Date(closeDate)
        : null;
    }

    const savedContent = await this.contentRepo.save(content);

    // Sync with List (RADAR)
    if (savedContent.type === ContentType.RADAR) {
      const contentWithList = await this.contentRepo.findOne({
        where: { id: savedContent.id },
        relations: ['list']
      });

      if (contentWithList && contentWithList.list) {
        let listChanged = false;

        // Sync publicationDate -> listDate
        if (contentWithList.publicationDate) {
          const contentDate = new Date(contentWithList.publicationDate);
          const listDate = contentWithList.list.listDate ? new Date(contentWithList.list.listDate) : null;

          if (!listDate || listDate.getTime() !== contentDate.getTime()) {
            contentWithList.list.listDate = contentDate;
            contentWithList.list.releaseDate = contentDate;
            listChanged = true;
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

    return savedContent;
  }

  async remove(id: string): Promise<void> {
    const content = await this.findOne(id);

    // Check if it has a list associated to delete it as well
    const contentWithList = await this.contentRepo.findOne({ where: { id }, relations: ['list'] });

    await this.contentRepo.remove(content);

    if (contentWithList && contentWithList.list) {
      // Call removeList on service, which tries to delete content but won't find it, then deletes list.
      await this.listsService.removeList(contentWithList.list.id);
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
      .where('content.publicationDate >= :startDate', { startDate })
      .andWhere('content.publicationDate <= :endDate', { endDate })
      .orderBy('content.publicationDate', 'DESC')
      .getMany();
  }
}
