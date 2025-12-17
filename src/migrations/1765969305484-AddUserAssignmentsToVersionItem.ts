import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserAssignmentsToVersionItem1765969305484 implements MigrationInterface {
    name = 'AddUserAssignmentsToVersionItem1765969305484'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "version_item" ADD "backUserId" uuid`);
        await queryRunner.query(`ALTER TABLE "version_item" ADD "frontUserId" uuid`);
        await queryRunner.query(`ALTER TABLE "version_item" ADD CONSTRAINT "FK_e8e898664f4b65d12587c87c8da" FOREIGN KEY ("backUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "version_item" ADD CONSTRAINT "FK_780bbdaa14c5bfe494e5ae6e829" FOREIGN KEY ("frontUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "version_item" DROP CONSTRAINT "FK_780bbdaa14c5bfe494e5ae6e829"`);
        await queryRunner.query(`ALTER TABLE "version_item" DROP CONSTRAINT "FK_e8e898664f4b65d12587c87c8da"`);
        await queryRunner.query(`ALTER TABLE "version_item" DROP COLUMN "frontUserId"`);
        await queryRunner.query(`ALTER TABLE "version_item" DROP COLUMN "backUserId"`);
    }

}
