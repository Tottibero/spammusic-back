import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
// 🔻 Cuando crees VersionItem, actualiza este import
import { VersionItem } from './version-item.entity';

@Entity()
export class Version {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // p. ej. "1.2.3" o el esquema que uses
  @Index({ unique: true })
  @Column('varchar', { length: 50 })
  version: string;

  @Column({ type: 'date', nullable: true })
  releaseDate?: Date;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @OneToMany(() => VersionItem, (item: VersionItem) => item.version, {
    cascade: true,
    eager: true,
  })
  items: VersionItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // 👇 Visibilidad al usuario final
  @Index()
  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  // (opcional) fecha de publicación
  @Column({ type: 'timestamptz', nullable: true })
  publishedAt?: Date;
}
