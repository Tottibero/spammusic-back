import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCloseDateToList1766052879932 implements MigrationInterface {
    name = 'AddCloseDateToList1766052879932'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reunions" DROP COLUMN "descripcion"`);
        await queryRunner.query(`ALTER TABLE "list" ADD "closeDate" date`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "list" DROP COLUMN "closeDate"`);
        await queryRunner.query(`ALTER TABLE "reunions" ADD "descripcion" text`);
    }

}
