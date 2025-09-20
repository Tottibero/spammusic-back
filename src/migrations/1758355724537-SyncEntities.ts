import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddArtistNameNormalized1699999999999
  implements MigrationInterface
{
  name = 'AddArtistNameNormalized1699999999999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS unaccent`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    // Columna normal (nullable al inicio)
    await queryRunner.query(`
      ALTER TABLE "artist"
      ADD COLUMN "name_normalized" text
    `);

    // Backfill de valores existentes
    await queryRunner.query(`
      UPDATE "artist"
      SET "name_normalized" = regexp_replace(lower(unaccent(name)), '\\s+', ' ', 'g')
    `);

    // Ahora hacemos NOT NULL si quieres
    await queryRunner.query(`
      ALTER TABLE "artist"
      ALTER COLUMN "name_normalized" SET NOT NULL
    `);

    // Índice trigram
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "artist_name_normalized_trgm_idx"
      ON "artist" USING GIN ("name_normalized" gin_trgm_ops)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "artist_name_normalized_trgm_idx"`,
    );
    await queryRunner.query(
      `ALTER TABLE "artist" DROP COLUMN "name_normalized"`,
    );
  }
}
