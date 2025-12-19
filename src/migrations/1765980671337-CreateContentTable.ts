import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateContentTable1765980671337 implements MigrationInterface {
    name = 'CreateContentTable1765980671337'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."content_type_enum" AS ENUM('article', 'photos', 'list', 'radar', 'best')`);
        await queryRunner.query(`CREATE TABLE "content" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."content_type_enum" NOT NULL, "name" character varying(200) NOT NULL, "notes" text, "publicationDate" date, "authorId" uuid, CONSTRAINT "PK_6a2083913f3647b44f205204e36" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "content" ADD CONSTRAINT "FK_93951308013e484eb6ab7888a1b" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "content" DROP CONSTRAINT "FK_93951308013e484eb6ab7888a1b"`);
        await queryRunner.query(`DROP TABLE "content"`);
        await queryRunner.query(`DROP TYPE "public"."content_type_enum"`);
    }

}
