import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBranchToVersionItem1690000000000 implements MigrationInterface {
  name = 'AddBranchToVersionItem1690000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "version_item"
      ADD "branch" varchar(200) NOT NULL DEFAULT 'main'
    `);
    await queryRunner.query(`
      ALTER TABLE "version_item"
      ALTER COLUMN "branch" DROP DEFAULT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "version_item" DROP COLUMN "branch"
    `);
  }
}
