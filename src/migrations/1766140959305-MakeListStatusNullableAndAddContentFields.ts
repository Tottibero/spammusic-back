import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeListStatusNullableAndAddContentFields1766140959305 implements MigrationInterface {
    name = 'MakeListStatusNullableAndAddContentFields1766140959305'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "list" ALTER COLUMN "status" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "list" ALTER COLUMN "status" SET NOT NULL`);
    }

}
