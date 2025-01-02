import { Artist } from 'src/artists/entities/artist.entity';
import { Rate } from 'src/rates/entities/rate.entity';
import { Genre } from 'src/genres/entities/genre.entity';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Disc {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 100 })
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('text', { nullable: true })
  image: string;

  @Column('boolean', { nullable: true })
  verified: boolean = false;

  @Column('boolean', { nullable: true })
  EP: boolean = false;

  @Column('varchar', { length: 255, nullable: true })
  link: string;

  @Column({ type: 'date', nullable: true })
  releaseDate: Date | null;

  @ManyToOne(() => Artist, (artist) => artist.disc, { eager: true })
  artist: Artist;

  @ManyToOne(() => Genre, (genre) => genre.disc)
  genre: Genre;

  @OneToMany(() => Rate, (rate) => rate.disc)
  rates: Rate[];
}
