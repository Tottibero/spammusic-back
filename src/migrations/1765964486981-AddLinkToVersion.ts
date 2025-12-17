import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLinkToVersion1765964486981 implements MigrationInterface {
    name = 'AddLinkToVersion1765964486981'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "version" ADD "link" character varying(500)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "version" DROP COLUMN "link"`);
    }

}
