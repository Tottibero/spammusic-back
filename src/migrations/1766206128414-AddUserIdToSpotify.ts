import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserIdToSpotify1766206128414 implements MigrationInterface {
    name = 'AddUserIdToSpotify1766206128414'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "spotify" ADD "userId" uuid`);
        await queryRunner.query(`ALTER TABLE "spotify" ADD CONSTRAINT "FK_c95472afea04c05258cd3ce595d" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "spotify" DROP CONSTRAINT "FK_c95472afea04c05258cd3ce595d"`);
        await queryRunner.query(`ALTER TABLE "spotify" DROP COLUMN "userId"`);
    }

}
