import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStatusToVersion1765872090185 implements MigrationInterface {
    name = 'AddStatusToVersion1765872090185'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "version_item" DROP COLUMN "publicVisible"`);
        await queryRunner.query(`CREATE TYPE "public"."version_status_enum" AS ENUM('en_produccion', 'en_desarrollo')`);
        await queryRunner.query(`ALTER TABLE "version" ADD "status" "public"."version_status_enum" NOT NULL DEFAULT 'en_desarrollo'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "version" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."version_status_enum"`);
        await queryRunner.query(`ALTER TABLE "version_item" ADD "publicVisible" boolean NOT NULL DEFAULT false`);
    }

}
