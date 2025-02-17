import { Asignation } from 'src/asignations/entities/asignations.entity';
import { Favorite } from 'src/favorites/entities/favorite.entity';
import { Pending } from 'src/pendings/entities/pending.entity';
import { Rate } from 'src/rates/entities/rate.entity';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column('text', { unique: true })
  email: string;

  @Column('text', { select: false })
  password: string;

  @Column('text', { unique: true })
  username: string;

  @Column('bool', {
    default: true,
  })
  isActive: boolean;

  @Column('text', {
    array: true,
    default: ['user'],
  })
  roles: string[];

  @Column('text', { nullable: true })
  image: string;

  @OneToMany(() => Rate, (rate) => rate.user, { cascade: true })
  rate: Rate;

  @OneToMany(() => Favorite, (favorite) => favorite.user, { cascade: true })
  favorite: Favorite;

  @OneToMany(() => Pending, (pending) => pending.user, { cascade: true })
  pending: Pending;

  @OneToMany(() => Asignation, (asignation) => asignation.user, {
    cascade: true,
  })
  asignations: Asignation[];

  @BeforeInsert()
  checkFieldsBeforeInsert() {
    this.email = this.email.toLowerCase().trim();
  }

  @BeforeUpdate()
  checkFieldsBeforeUpdate() {
    this.checkFieldsBeforeInsert();
  }
}
