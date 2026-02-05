import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCreatedAtAndNotesToUser1770324545919 implements MigrationInterface {
    name = 'AddCreatedAtAndNotesToUser1770324545919'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "users" ADD "notes" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "notes"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "createdAt"`);
    }

}
