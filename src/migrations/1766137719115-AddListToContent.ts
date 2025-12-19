import { MigrationInterface, QueryRunner } from "typeorm";

export class AddListToContent1766137719115 implements MigrationInterface {
    name = 'AddListToContent1766137719115'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "content" ADD "closeDate" date`);
        await queryRunner.query(`ALTER TABLE "content" ADD "listId" uuid`);
        await queryRunner.query(`ALTER TABLE "content" ADD CONSTRAINT "UQ_07dd722420df83c4a9fac3ed11a" UNIQUE ("listId")`);
        await queryRunner.query(`ALTER TABLE "content" ADD CONSTRAINT "FK_07dd722420df83c4a9fac3ed11a" FOREIGN KEY ("listId") REFERENCES "list"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "content" DROP CONSTRAINT "FK_07dd722420df83c4a9fac3ed11a"`);
        await queryRunner.query(`ALTER TABLE "content" DROP CONSTRAINT "UQ_07dd722420df83c4a9fac3ed11a"`);
        await queryRunner.query(`ALTER TABLE "content" DROP COLUMN "listId"`);
        await queryRunner.query(`ALTER TABLE "content" DROP COLUMN "closeDate"`);
    }

}
