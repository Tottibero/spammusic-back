import { Module } from '@nestjs/common';
import { ListsService } from './list.service';
import { ListsController } from './list.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { List } from './entities/list.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [ListsController], // Controllers go here
  providers: [ListsService], // Providers (services) go here
  imports: [TypeOrmModule.forFeature([List]), AuthModule], // Ensure the List entity is registered
})
export class ListsModule {}
