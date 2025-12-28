import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFreeAndVideoToList1766154000000 implements MigrationInterface {
    name = 'AddFreeAndVideoToList1766154000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "list" ADD "free" boolean DEFAULT false`);

        await queryRunner.query(`ALTER TYPE "public"."list_type_enum" RENAME TO "list_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."list_type_enum" AS ENUM('month', 'week', 'special', 'video')`);
        await queryRunner.query(`ALTER TABLE "list" ALTER COLUMN "type" TYPE "public"."list_type_enum" USING "type"::"text"::"public"."list_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."list_type_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "list" DROP COLUMN "free"`);

        await queryRunner.query(`CREATE TYPE "public"."list_type_enum_old" AS ENUM('month', 'week', 'special')`);
        await queryRunner.query(`ALTER TABLE "list" ALTER COLUMN "type" TYPE "public"."list_type_enum_old" USING "type"::"text"::"public"."list_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."list_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."list_type_enum_old" RENAME TO "list_type_enum"`);
    }

}
