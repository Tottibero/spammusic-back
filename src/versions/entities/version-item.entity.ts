import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Version } from './version.entity';

export enum ChangeType {
  FEAT = 'feat', // Nueva funcionalidad
  FIX = 'fix', // Corrección de bug
  DOCS = 'docs', // Cambios en documentación
  STYLE = 'style', // Cambios de formato (espacios, comas, etc.)
  REFACTOR = 'refactor', // Cambios internos sin añadir ni corregir funcionalidades
  PERF = 'perf', // Mejoras de rendimiento
  TEST = 'test', // Añadir o modificar tests
  BUILD = 'build', // Cambios en el sistema de build o dependencias
  CI = 'ci', // Cambios en configuración de CI
  CHORE = 'chore', // Mantenimiento general
  REVERT = 'revert', // Revertir un commit previo
}

@Entity()
export class VersionItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ChangeType,
  })
  type: ChangeType;

  @Column('text')
  description: string;

  @Column('varchar', { length: 100, nullable: true })
  scope?: string;

  @Column({ type: 'boolean', default: false })
  breaking?: boolean;

  // 🔹 Nuevo campo para decidir si este cambio se muestra en las notas públicas
  @Column({ type: 'boolean', default: false })
  publicVisible: boolean;

  @ManyToOne(() => Version, (version) => version.items, {
    onDelete: 'CASCADE',
  })
  version: Version;
}
