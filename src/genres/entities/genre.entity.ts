import { Disc } from 'src/discs/entities/disc.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Genre {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 50 })
  name: string;

  @OneToMany(() => Disc, (disc) => disc.genre)
  disc: Disc[];
}
