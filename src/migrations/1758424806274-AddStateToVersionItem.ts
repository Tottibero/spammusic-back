import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStateToVersionItem1758424806274 implements MigrationInterface {
    name = 'AddStateToVersionItem1758424806274'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "version_item" DROP CONSTRAINT "FK_version_item_version"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_version_unique"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_version_isActive"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_version_active_published"`);
        await queryRunner.query(`DROP INDEX "public"."artist_name_normalized_trgm_idx"`);
        await queryRunner.query(`CREATE TYPE "public"."version_item_state_enum" AS ENUM('todo', 'in_progress', 'in_review', 'done')`);
        await queryRunner.query(`ALTER TABLE "version_item" ADD "state" "public"."version_item_state_enum" NOT NULL DEFAULT 'todo'`);
        await queryRunner.query(`CREATE INDEX "IDX_b465f232f25bec4438d7aa595b" ON "version_item" ("state") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_efaf48ac3246f46e661a338640" ON "version" ("version") `);
        await queryRunner.query(`CREATE INDEX "IDX_1e05e4480b1febdf5e059e7b4d" ON "version" ("isActive") `);
        await queryRunner.query(`ALTER TABLE "version_item" ADD CONSTRAINT "FK_6fa9ba1bd1cae7af93f8de05680" FOREIGN KEY ("versionId") REFERENCES "version"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "version_item" DROP CONSTRAINT "FK_6fa9ba1bd1cae7af93f8de05680"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1e05e4480b1febdf5e059e7b4d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_efaf48ac3246f46e661a338640"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b465f232f25bec4438d7aa595b"`);
        await queryRunner.query(`ALTER TABLE "version_item" DROP COLUMN "state"`);
        await queryRunner.query(`DROP TYPE "public"."version_item_state_enum"`);
        await queryRunner.query(`CREATE INDEX "artist_name_normalized_trgm_idx" ON "artist" ("name_normalized") `);
        await queryRunner.query(`CREATE INDEX "IDX_version_active_published" ON "version" ("isActive", "publishedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_version_isActive" ON "version" ("isActive") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_version_unique" ON "version" ("version") `);
        await queryRunner.query(`ALTER TABLE "version_item" ADD CONSTRAINT "FK_version_item_version" FOREIGN KEY ("versionId") REFERENCES "version"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
