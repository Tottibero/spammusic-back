import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserToSpotify1766178367407 implements MigrationInterface {
    name = 'AddUserToSpotify1766178367407'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "list" DROP COLUMN "free"`);
        await queryRunner.query(`ALTER TABLE "spotify" ADD "userId" uuid`);
        await queryRunner.query(`ALTER TYPE "public"."list_type_enum" RENAME TO "list_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."list_type_enum" AS ENUM('month', 'week', 'special')`);
        await queryRunner.query(`ALTER TABLE "list" ALTER COLUMN "type" TYPE "public"."list_type_enum" USING "type"::"text"::"public"."list_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."list_type_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."list_status_enum" RENAME TO "list_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."list_status_enum" AS ENUM('new', 'assigned', 'completed', 'revised', 'withimage', 'scheduled', 'webpublished', 'smpublished')`);
        await queryRunner.query(`ALTER TABLE "list" ALTER COLUMN "status" TYPE "public"."list_status_enum" USING "status"::"text"::"public"."list_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."list_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "spotify" ADD CONSTRAINT "FK_c95472afea04c05258cd3ce595d" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "spotify" DROP CONSTRAINT "FK_c95472afea04c05258cd3ce595d"`);
        await queryRunner.query(`CREATE TYPE "public"."list_status_enum_old" AS ENUM('new', 'assigned', 'published')`);
        await queryRunner.query(`ALTER TABLE "list" ALTER COLUMN "status" TYPE "public"."list_status_enum_old" USING "status"::"text"::"public"."list_status_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."list_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."list_status_enum_old" RENAME TO "list_status_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."list_type_enum_old" AS ENUM('month', 'week', 'special', 'video')`);
        await queryRunner.query(`ALTER TABLE "list" ALTER COLUMN "type" TYPE "public"."list_type_enum_old" USING "type"::"text"::"public"."list_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."list_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."list_type_enum_old" RENAME TO "list_type_enum"`);
        await queryRunner.query(`ALTER TABLE "spotify" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "list" ADD "free" boolean DEFAULT false`);
    }

}
