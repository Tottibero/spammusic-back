import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from 'src/auth/entities/user.entity';
import { Disc } from 'src/discs/entities/disc.entity';

@Entity()
export class Rate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('decimal', { precision: 4, scale: 2, nullable: true })
  rate: number;

  @Column('decimal', { precision: 4, scale: 2, nullable: true })
  cover: number;

  @ManyToOne(() => User, (user) => user.rate, { eager: true })
  user: User;

  @ManyToOne(() => Disc, (disc) => disc.rates, {
    onDelete: 'CASCADE',
    eager: true,
  })
  disc: Disc;
}
