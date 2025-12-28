import { MigrationInterface, QueryRunner } from "typeorm";

export class RefactorArticlesAndSpotifyEnglishFields1766398035718 implements MigrationInterface {
    name = 'RefactorArticlesAndSpotifyEnglishFields1766398035718'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "spotify" RENAME COLUMN "nombre" TO "name"`);
        await queryRunner.query(`ALTER TABLE "spotify" RENAME COLUMN "enlace" TO "link"`);

        // Handle Enum changes: estado -> status
        await queryRunner.query(`ALTER TABLE "spotify" RENAME COLUMN "estado" TO "status"`);
        await queryRunner.query(`CREATE TYPE "public"."spotify_status_enum" AS ENUM('actualizada', 'publicada', 'para_publicar', 'por_actualizar', 'en_desarrollo')`);
        await queryRunner.query(`ALTER TABLE "spotify" ALTER COLUMN "status" TYPE "public"."spotify_status_enum" USING "status"::text::"public"."spotify_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."spotify_estado_enum"`);

        // Handle Enum changes: tipo -> type
        await queryRunner.query(`ALTER TABLE "spotify" RENAME COLUMN "tipo" TO "type"`);
        await queryRunner.query(`CREATE TYPE "public"."spotify_type_enum" AS ENUM('festival', 'especial', 'genero', 'otras')`);
        await queryRunner.query(`ALTER TABLE "spotify" ALTER COLUMN "type" TYPE "public"."spotify_type_enum" USING "type"::text::"public"."spotify_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."spotify_tipo_enum"`);

        // Article creation
        await queryRunner.query(`CREATE TYPE "public"."article_status_enum" AS ENUM('not_started', 'writing', 'editing', 'ready', 'published')`);
        await queryRunner.query(`CREATE TYPE "public"."article_type_enum" AS ENUM('cronica', 'festival', 'review', 'entrevista', 'articulo')`);
        await queryRunner.query(`CREATE TABLE "article" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(200) NOT NULL, "status" "public"."article_status_enum" NOT NULL, "link" character varying(500), "type" "public"."article_type_enum" NOT NULL, "fecha_actualizacion" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "PK_40808690eb7b915046558c0f81b" PRIMARY KEY ("id"))`);

        await queryRunner.query(`ALTER TABLE "content" ADD "articleId" uuid`);
        await queryRunner.query(`ALTER TABLE "content" ADD CONSTRAINT "UQ_ae4cf5971a967551d3953fa4045" UNIQUE ("articleId")`);
        await queryRunner.query(`ALTER TABLE "article" ADD CONSTRAINT "FK_636f17dadfea1ffb4a412296a28" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "content" ADD CONSTRAINT "FK_ae4cf5971a967551d3953fa4045" FOREIGN KEY ("articleId") REFERENCES "article"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "content" DROP CONSTRAINT "FK_ae4cf5971a967551d3953fa4045"`);
        await queryRunner.query(`ALTER TABLE "article" DROP CONSTRAINT "FK_636f17dadfea1ffb4a412296a28"`);
        await queryRunner.query(`ALTER TABLE "spotify" RENAME COLUMN "name" TO "nombre"`);
        await queryRunner.query(`ALTER TABLE "spotify" RENAME COLUMN "link" TO "enlace"`);

        // Revert Enum changes: status -> estado
        await queryRunner.query(`ALTER TABLE "spotify" RENAME COLUMN "status" TO "estado"`);
        await queryRunner.query(`CREATE TYPE "public"."spotify_estado_enum" AS ENUM('actualizada', 'publicada', 'para_publicar', 'por_actualizar', 'en_desarrollo')`);
        await queryRunner.query(`ALTER TABLE "spotify" ALTER COLUMN "estado" TYPE "public"."spotify_estado_enum" USING "estado"::text::"public"."spotify_estado_enum"`);
        await queryRunner.query(`DROP TYPE "public"."spotify_status_enum"`);

        // Revert Enum changes: type -> tipo
        await queryRunner.query(`ALTER TABLE "spotify" RENAME COLUMN "type" TO "tipo"`);
        await queryRunner.query(`CREATE TYPE "public"."spotify_tipo_enum" AS ENUM('festival', 'especial', 'genero', 'otras')`);
        await queryRunner.query(`ALTER TABLE "spotify" ALTER COLUMN "tipo" TYPE "public"."spotify_tipo_enum" USING "tipo"::text::"public"."spotify_tipo_enum"`);
        await queryRunner.query(`DROP TYPE "public"."spotify_type_enum"`);
        await queryRunner.query(`DROP TABLE "article"`);
        await queryRunner.query(`DROP TYPE "public"."article_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."article_status_enum"`);
    }

}
