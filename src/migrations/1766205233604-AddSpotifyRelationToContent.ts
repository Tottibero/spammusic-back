import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSpotifyRelationToContent1766205233604 implements MigrationInterface {
    name = 'AddSpotifyRelationToContent1766205233604'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "content" ADD "spotifyId" uuid`);
        await queryRunner.query(`ALTER TABLE "content" ADD CONSTRAINT "UQ_07e8d421f792de1e393e78735d1" UNIQUE ("spotifyId")`);
        await queryRunner.query(`ALTER TABLE "content" ALTER COLUMN "type" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "content" ADD CONSTRAINT "FK_07e8d421f792de1e393e78735d1" FOREIGN KEY ("spotifyId") REFERENCES "spotify"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "content" DROP CONSTRAINT "FK_07e8d421f792de1e393e78735d1"`);
        await queryRunner.query(`ALTER TABLE "content" ALTER COLUMN "type" SET DEFAULT 'article'`);
        await queryRunner.query(`ALTER TABLE "content" DROP CONSTRAINT "UQ_07e8d421f792de1e393e78735d1"`);
        await queryRunner.query(`ALTER TABLE "content" DROP COLUMN "spotifyId"`);
    }

}
