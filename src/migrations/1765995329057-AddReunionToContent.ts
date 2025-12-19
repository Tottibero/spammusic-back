import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReunionToContent1765995329057 implements MigrationInterface {
    name = 'AddReunionToContent1765995329057'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "content" ADD "reunionId" uuid`);
        await queryRunner.query(`ALTER TABLE "content" ADD CONSTRAINT "FK_a2e766b5c4c672b2108eb7d9887" FOREIGN KEY ("reunionId") REFERENCES "reunions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "content" DROP CONSTRAINT "FK_a2e766b5c4c672b2108eb7d9887"`);
        await queryRunner.query(`ALTER TABLE "content" DROP COLUMN "reunionId"`);
    }

}
