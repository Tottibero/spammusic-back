import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDescriptionToReunion1765995817204 implements MigrationInterface {
    name = 'AddDescriptionToReunion1765995817204'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reunions" ADD "descripcion" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reunions" DROP COLUMN "descripcion"`);
    }

}
