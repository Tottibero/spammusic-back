import { Country } from 'src/countries/entities/country.entity';
import { Disc } from 'src/discs/entities/disc.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Artist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 100 })
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('text', { nullable: true })
  image: string;

  @ManyToOne(() => Country, (country) => country.artist, {
    eager: true,
    nullable: true, // si quieres permitir artistas sin país
  })
  @JoinColumn({ name: 'countryId' }) // <- necesario si defines el campo manual
  country: Country;

  @Column({ nullable: true })
  countryId: string;

  @OneToMany(() => Disc, (disc) => disc.artist)
  disc: Disc[];
}
