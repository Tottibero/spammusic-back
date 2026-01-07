import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeDatesToTimestamp1767750000000 implements MigrationInterface {
    name = 'ChangeDatesToTimestamp1767750000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Content table
        await queryRunner.query(`ALTER TABLE "content" ALTER COLUMN "publicationDate" TYPE timestamp`);
        await queryRunner.query(`ALTER TABLE "content" ALTER COLUMN "closeDate" TYPE timestamp`);
        await queryRunner.query(`ALTER TABLE "content" ALTER COLUMN "listDate" TYPE timestamp`);

        // List table
        await queryRunner.query(`ALTER TABLE "list" ALTER COLUMN "listDate" TYPE timestamp`);
        await queryRunner.query(`ALTER TABLE "list" ALTER COLUMN "releaseDate" TYPE timestamp`);
        await queryRunner.query(`ALTER TABLE "list" ALTER COLUMN "closeDate" TYPE timestamp`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert List table
        await queryRunner.query(`ALTER TABLE "list" ALTER COLUMN "closeDate" TYPE date`);
        await queryRunner.query(`ALTER TABLE "list" ALTER COLUMN "releaseDate" TYPE date`);
        await queryRunner.query(`ALTER TABLE "list" ALTER COLUMN "listDate" TYPE date`);

        // Revert Content table
        await queryRunner.query(`ALTER TABLE "content" ALTER COLUMN "listDate" TYPE date`);
        await queryRunner.query(`ALTER TABLE "content" ALTER COLUMN "closeDate" TYPE date`);
        await queryRunner.query(`ALTER TABLE "content" ALTER COLUMN "publicationDate" TYPE date`);
    }

}
