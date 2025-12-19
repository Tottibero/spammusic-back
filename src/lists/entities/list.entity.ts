import { Asignation } from 'src/asignations/entities/asignations.entity';
import { Link } from 'src/links/entities/links.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

export enum ListType {
  MONTH = 'month',
  WEEK = 'week',
  SPECIAL = 'special',
}

export enum ListStatus {
  NEW = 'new',
  ASSIGNED = 'assigned',
  COMPLETED = 'completed',
  REVISED = 'revised',
  WITHIMAGE = 'withimage',
  SCHEDULED = 'scheduled',
  WEBPUBLISHED = 'webpublished',
  SMPUBLISHED = 'smpublished',
}

@Entity()
export class List {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 100 })
  name: string;

  @Column({
    type: 'enum',
    enum: ListType,
  })
  type: ListType;

  @Column({
    type: 'enum',
    enum: ListStatus,
    nullable: true,
  })
  status?: ListStatus;

  @Column({ type: 'date', nullable: true })
  listDate?: Date;

  @Column({ type: 'date', nullable: true })
  releaseDate?: Date;

  @Column({ type: 'date', nullable: true })
  closeDate?: Date;

  @OneToMany(() => Asignation, (asignation) => asignation.list, {
    cascade: true,
    eager: true,
  })
  asignations: Asignation[];

  @OneToMany(() => Link, (link) => link.list, {
    cascade: true,
    eager: true,
  })
  links: Link[];
}
