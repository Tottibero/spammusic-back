import { Module } from '@nestjs/common';
import { ListsService } from './list.service';
import { ListsController } from './list.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { List } from './entities/list.entity';
import { AuthModule } from 'src/auth/auth.module';

import { ContentsModule } from 'src/contents/contents.module';
import { forwardRef } from '@nestjs/common';

@Module({
  controllers: [ListsController], // Controllers go here
  providers: [ListsService], // Providers (services) go here
  imports: [TypeOrmModule.forFeature([List]), AuthModule, forwardRef(() => ContentsModule)], // Ensure the List entity is registered
  exports: [ListsService],
})
export class ListsModule { }
