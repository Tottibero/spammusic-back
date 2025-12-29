import { MigrationInterface, QueryRunner } from "typeorm";

export class AddListDateToContent1767027355740 implements MigrationInterface {
    name = 'AddListDateToContent1767027355740'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "content" ADD "listDate" date`);
        await queryRunner.query(`ALTER TYPE "public"."list_status_enum" RENAME TO "list_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."list_status_enum" AS ENUM('new', 'assigned', 'published')`);
        await queryRunner.query(`ALTER TABLE "list" ALTER COLUMN "status" TYPE "public"."list_status_enum" USING "status"::"text"::"public"."list_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."list_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "list" ALTER COLUMN "free" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "list" ALTER COLUMN "free" SET NOT NULL`);
        await queryRunner.query(`CREATE TYPE "public"."list_status_enum_old" AS ENUM('published', 'new', 'assigned', 'completed', 'revised', 'withimage', 'scheduled', 'webpublished', 'smpublished')`);
        await queryRunner.query(`ALTER TABLE "list" ALTER COLUMN "status" TYPE "public"."list_status_enum_old" USING "status"::"text"::"public"."list_status_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."list_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."list_status_enum_old" RENAME TO "list_status_enum"`);
        await queryRunner.query(`ALTER TABLE "content" DROP COLUMN "listDate"`);
    }

}
