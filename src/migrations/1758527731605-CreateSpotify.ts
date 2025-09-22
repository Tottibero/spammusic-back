import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSpotify1758527731605 implements MigrationInterface {
    name = 'CreateSpotify1758527731605'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."spotify_estado_enum" AS ENUM('actualizada', 'publicada', 'para_publicar', 'por_actualizar', 'en_desarrollo')`);
        await queryRunner.query(`CREATE TYPE "public"."spotify_tipo_enum" AS ENUM('festival', 'especial', 'genero', 'otras')`);
        await queryRunner.query(`CREATE TABLE "spotify" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" character varying(200) NOT NULL, "estado" "public"."spotify_estado_enum" NOT NULL, "enlace" character varying(500) NOT NULL, "tipo" "public"."spotify_tipo_enum" NOT NULL, "fecha_actualizacion" TIMESTAMP WITH TIME ZONE NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_8f15f9b9026ec86cad486e3d56d" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "spotify"`);
        await queryRunner.query(`DROP TYPE "public"."spotify_tipo_enum"`);
        await queryRunner.query(`DROP TYPE "public"."spotify_estado_enum"`);
    }

}
