import { IsNotEmpty, IsString, IsObject, IsOptional } from 'class-validator';
import { Column } from 'typeorm';

export class CreatePointDto {
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @Column({ type: 'text', nullable: true }) // El campo es opcional y permite nulos en la base de datos
  @IsOptional() // Validar que sea opcional
  @IsString() // Si se proporciona, debe ser una cadena
  content?: string; // Ahora el campo puede ser opcional

  @IsNotEmpty()
  reunionId: number; // ID de la reunión a la que pertenece este punto
}
