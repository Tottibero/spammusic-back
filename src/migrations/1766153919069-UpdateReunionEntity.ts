import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateReunionEntity1766153919069 implements MigrationInterface {
    name = 'UpdateReunionEntity1766153919069'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reunions" RENAME COLUMN "fecha" TO "date"`);
        await queryRunner.query(`ALTER TABLE "reunions" RENAME COLUMN "titulo" TO "title"`);
        await queryRunner.query(`ALTER TABLE "reunions" ADD "description" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reunions" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "reunions" RENAME COLUMN "title" TO "titulo"`);
        await queryRunner.query(`ALTER TABLE "reunions" RENAME COLUMN "date" TO "fecha"`);
    }

}
