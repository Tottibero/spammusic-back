import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Point } from 'src/points/entities/point.entity';

@Entity('reunions') // Nombre de la tabla en plural (opcional, ajusta según tu convención)
export class Reunion {
  @PrimaryGeneratedColumn('uuid')
  id: number;

  @Column({ type: 'varchar', length: 255 })
  titulo: string;

  @Column({ type: 'timestamp' })
  fecha: Date;

  @OneToMany(() => Point, (point) => point.reunion, { cascade: true })
  points: Point[]; // Relación uno a muchos con la entidad Point

  @Column({ type: 'date', nullable: true })
  createdAt: Date; // Fecha de creación automática
}
