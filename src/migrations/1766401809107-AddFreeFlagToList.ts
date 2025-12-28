import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFreeFlagToList1766401809107 implements MigrationInterface {
    name = 'AddFreeFlagToList1766401809107'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "list" ADD "free" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "list" DROP COLUMN "free"`);
    }

}
