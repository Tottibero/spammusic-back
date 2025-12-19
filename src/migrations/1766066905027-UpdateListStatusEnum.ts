import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateListStatusEnum1766066905027 implements MigrationInterface {
    name = 'UpdateListStatusEnum1766066905027'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."list_status_enum" RENAME TO "list_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."list_status_enum" AS ENUM('new', 'assigned', 'smpublished')`);
        await queryRunner.query(`
            ALTER TABLE "list" 
            ALTER COLUMN "status" 
            TYPE "public"."list_status_enum" 
            USING (
                CASE "status"::text
                    WHEN 'smpublished' THEN 'smpublished'
                    WHEN 'webpublished' THEN 'smpublished'
                    WHEN 'published' THEN 'smpublished'
                    WHEN 'completed' THEN 'smpublished'
                    WHEN 'new' THEN 'new'
                    WHEN 'assigned' THEN 'assigned'
                    ELSE 'assigned'
                END
            )::"public"."list_status_enum"
        `);
        await queryRunner.query(`DROP TYPE "public"."list_status_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."list_status_enum_old" AS ENUM('new', 'assigned', 'completed', 'revised', 'withimage', 'scheduled', 'webpublished', 'smpublished')`);
        await queryRunner.query(`ALTER TABLE "list" ALTER COLUMN "status" TYPE "public"."list_status_enum_old" USING "status"::"text"::"public"."list_status_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."list_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."list_status_enum_old" RENAME TO "list_status_enum"`);
    }

}
