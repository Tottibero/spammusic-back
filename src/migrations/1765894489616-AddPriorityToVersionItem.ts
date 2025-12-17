import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPriorityToVersionItem1765894489616 implements MigrationInterface {
    name = 'AddPriorityToVersionItem1765894489616'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "version_item" RENAME COLUMN "breaking" TO "priority"`);
        await queryRunner.query(`ALTER TABLE "version_item" DROP COLUMN "priority"`);
        await queryRunner.query(`CREATE TYPE "public"."version_item_priority_enum" AS ENUM('low', 'medium', 'high', 'suggestion')`);
        await queryRunner.query(`ALTER TABLE "version_item" ADD "priority" "public"."version_item_priority_enum" NOT NULL DEFAULT 'medium'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "version_item" DROP COLUMN "priority"`);
        await queryRunner.query(`DROP TYPE "public"."version_item_priority_enum"`);
        await queryRunner.query(`ALTER TABLE "version_item" ADD "priority" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "version_item" RENAME COLUMN "priority" TO "breaking"`);
    }

}
