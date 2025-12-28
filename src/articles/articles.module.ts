import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArticlesService } from './articles.service';
import { ArticlesController } from './articles.controller';
import { Article } from './entities/article.entity';
import { ContentsModule } from 'src/contents/contents.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Article]),
        forwardRef(() => ContentsModule),
    ],
    controllers: [ArticlesController],
    providers: [ArticlesService],
    exports: [ArticlesService, TypeOrmModule],
})
export class ArticlesModule { }
