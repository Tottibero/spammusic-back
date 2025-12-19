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
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'timestamp' })
  date: Date;

  @OneToMany(() => Point, (point) => point.reunion, { cascade: true })
  points: Point[]; // Relación uno a muchos con la entidad Point

  @Column({ type: 'date', nullable: true })
  createdAt: Date; // Fecha de creación automática
}
