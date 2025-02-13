import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from 'src/auth/entities/user.entity';
import { Disc } from 'src/discs/entities/disc.entity';

@Entity()
export class Pending {
  @PrimaryGeneratedColumn('uuid')
  id: string;


  @ManyToOne(() => User, (user) => user.rate, { eager: true })
  user: User;

  @ManyToOne(() => Disc, (disc) => disc.pendings, {
    onDelete: 'CASCADE',
  })
  disc: Disc;
}
