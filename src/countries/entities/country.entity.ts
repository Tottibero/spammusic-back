import { Artist } from 'src/artists/entities/artist.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Country {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 50 })
  name: string;

  @OneToMany(() => Artist, (artist) => artist.country, { cascade: true })
  artist: Artist[];
}
