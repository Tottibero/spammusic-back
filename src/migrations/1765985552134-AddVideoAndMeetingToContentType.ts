import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVideoAndMeetingToContentType1765985552134 implements MigrationInterface {
    name = 'AddVideoAndMeetingToContentType1765985552134'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."content_type_enum" RENAME TO "content_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."content_type_enum" AS ENUM('article', 'photos', 'list', 'radar', 'best', 'video', 'meeting')`);
        await queryRunner.query(`ALTER TABLE "content" ALTER COLUMN "type" TYPE "public"."content_type_enum" USING "type"::"text"::"public"."content_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."content_type_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."content_type_enum_old" AS ENUM('article', 'photos', 'list', 'radar', 'best')`);
        await queryRunner.query(`ALTER TABLE "content" ALTER COLUMN "type" TYPE "public"."content_type_enum_old" USING "type"::"text"::"public"."content_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."content_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."content_type_enum_old" RENAME TO "content_type_enum"`);
    }

}
