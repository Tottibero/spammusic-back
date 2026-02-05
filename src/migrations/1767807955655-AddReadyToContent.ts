import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReadyToContent1767807955655 implements MigrationInterface {
    name = 'AddReadyToContent1767807955655'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "content" ADD "ready" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "content" DROP COLUMN "ready"`);
    }

}
