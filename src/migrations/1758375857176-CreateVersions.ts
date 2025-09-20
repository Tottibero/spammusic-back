import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVersions1758375857176 implements MigrationInterface {
  name = 'CreateVersions1758375857176';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Usa pgcrypto para gen_random_uuid()
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    // Enum para VersionItem.type
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'version_item_type_enum') THEN
          CREATE TYPE "public"."version_item_type_enum" AS ENUM(
            'feat','fix','docs','style','refactor','perf','test','build','ci','chore','revert'
          );
        END IF;
      END$$;
    `);

    // Tabla version
    await queryRunner.query(`
      CREATE TABLE "version" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "version" varchar(50) NOT NULL,
        "releaseDate" date,
        "notes" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "isActive" boolean NOT NULL DEFAULT false,
        "publishedAt" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_4fb5fbb15a43da9f35493107b1d" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_version_unique" ON "version" ("version")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_version_isActive" ON "version" ("isActive")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_version_active_published" ON "version" ("isActive", "publishedAt" DESC)`,
    );

    // Tabla version_item
    await queryRunner.query(`
      CREATE TABLE "version_item" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "type" "public"."version_item_type_enum" NOT NULL,
        "description" text NOT NULL,
        "scope" varchar(100),
        "breaking" boolean NOT NULL DEFAULT false,
        "publicVisible" boolean NOT NULL DEFAULT false,
        "versionId" uuid,
        CONSTRAINT "PK_d34ea0d6e4a586e36a5560239ed" PRIMARY KEY ("id"),
        CONSTRAINT "FK_version_item_version" FOREIGN KEY ("versionId")
          REFERENCES "version"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "version_item" DROP CONSTRAINT "FK_version_item_version"`,
    );
    await queryRunner.query(`DROP TABLE "version_item"`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_version_active_published"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_version_isActive"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_version_unique"`);

    await queryRunner.query(`DROP TABLE "version"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."version_item_type_enum"`,
    );
    // No tocamos extensiones.
  }
}
