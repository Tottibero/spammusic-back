import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDebutToDisc1765977651750 implements MigrationInterface {
    name = 'AddDebutToDisc1765977651750'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "disc" ADD "debut" boolean`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "disc" DROP COLUMN "debut"`);
    }

}
