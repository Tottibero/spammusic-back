import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from 'src/auth/entities/user.entity';
import { Disc } from 'src/discs/entities/disc.entity';

@Entity()
export class Favorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.favorite, { eager: true })
  user: User;

  @ManyToOne(() => Disc, (disc) => disc.favorites, {
    onDelete: 'CASCADE',
  })
  disc: Disc;
}
