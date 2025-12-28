import { MigrationInterface, QueryRunner } from "typeorm";

export class CorrectContentTypeEnum1766204357843 implements MigrationInterface {
    name = 'CorrectContentTypeEnum1766204357843'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // These were likely handled by previous migration if it ran, but since it's a new generated one
        // TypeORM might see them as 'missing' since I manually reverted Entity changes but migration remained?

        // Check if column exists before trying to drop? No, standard migration doesn't do that.
        // The error says "FK... does not exist" and it happened in the *second* migration attempted in the batch.
        // "UpdateContentTypeAndRelations1766204149725 has been executed successfully." -> This one dropped the FK and Column!
        // "CorrectContentTypeEnum1766204357843" -> This one tries to drop them AGAIN because TypeORM generated it based on current Entity vs (What it thinks is DB).

        // I should remove lines 7 and 8 from this migration.
        await queryRunner.query(`ALTER TYPE "public"."content_type_enum" RENAME TO "content_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."content_type_enum" AS ENUM('article', 'photos', 'spotify', 'radar', 'best', 'video', 'reunion')`);
        await queryRunner.query(`
            ALTER TABLE "content" 
            ALTER COLUMN "type" 
            TYPE "public"."content_type_enum" 
            USING (
                CASE "type"::text
                    WHEN 'list' THEN 'spotify'
                    WHEN 'meeting' THEN 'reunion'
                    ELSE "type"::text
                END
            )::"public"."content_type_enum"
        `);
        await queryRunner.query(`ALTER TABLE "content" ALTER COLUMN "type" SET DEFAULT 'article'`);
        await queryRunner.query(`DROP TYPE "public"."content_type_enum_old"`);
        await queryRunner.query(`ALTER TABLE "content" ALTER COLUMN "type" SET DEFAULT 'article'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "content" ALTER COLUMN "type" DROP DEFAULT`);
        await queryRunner.query(`CREATE TYPE "public"."content_type_enum_old" AS ENUM('article', 'photos', 'list', 'radar', 'best', 'video', 'meeting')`);
        await queryRunner.query(`ALTER TABLE "content" ALTER COLUMN "type" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "content" ALTER COLUMN "type" TYPE "public"."content_type_enum_old" USING "type"::"text"::"public"."content_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."content_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."content_type_enum_old" RENAME TO "content_type_enum"`);
        await queryRunner.query(`ALTER TABLE "spotify" ADD "userId" uuid`);
        await queryRunner.query(`ALTER TABLE "spotify" ADD CONSTRAINT "FK_c95472afea04c05258cd3ce595d" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
