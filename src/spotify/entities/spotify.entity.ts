import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum SpotifyEstado {
  ACTUALIZADA = 'actualizada',
  PUBLICADA = 'publicada',
  PARA_PUBLICAR = 'para_publicar',
  POR_ACTUALIZAR = 'por_actualizar',
  EN_DESARROLLO = 'en_desarrollo',
}

export enum SpotifyTipo {
  FESTIVAL = 'festival',
  ESPECIAL = 'especial',
  GENERO = 'genero',
  OTRAS = 'otras',
}

@Entity('spotify')
export class Spotify {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  nombre: string;

  @Column({ type: 'enum', enum: SpotifyEstado })
  estado: SpotifyEstado;

  @Column({ type: 'varchar', length: 500 })
  enlace: string;

  @Column({ type: 'enum', enum: SpotifyTipo })
  tipo: SpotifyTipo;

  @Column({ type: 'timestamp with time zone', name: 'fecha_actualizacion' })
  fechaActualizacion: Date;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
