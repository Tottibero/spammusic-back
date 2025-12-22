import { MigrationInterface, QueryRunner } from "typeorm";

export class RestoreOldListStatusEnum1766155000000 implements MigrationInterface {
    name = 'RestoreOldListStatusEnum1766155000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Renombrar el enum actual (que solo tiene new, assigned, published)
        await queryRunner.query(`ALTER TYPE "public"."list_status_enum" RENAME TO "list_status_enum_failed"`);

        // Crear el enum ORIGINAL completo
        await queryRunner.query(`CREATE TYPE "public"."list_status_enum" AS ENUM('new', 'assigned', 'completed', 'revised', 'withimage', 'scheduled', 'webpublished', 'smpublished')`);

        // Migrar los datos de vuelta. 
        // Asumimos que 'published' en la DB actual equivale a 'smpublished' (que es lo que quiere el usuario)
        await queryRunner.query(`
            ALTER TABLE "list" 
            ALTER COLUMN "status" 
            TYPE "public"."list_status_enum" 
            USING (
                CASE "status"::text
                    WHEN 'published' THEN 'smpublished'
                    WHEN 'new' THEN 'new'
                    WHEN 'assigned' THEN 'assigned'
                    -- Por seguridad, si quedo algo raro, lo mandamos a smpublished si parece publicado, o assigned
                    ELSE 'assigned'
                END
            )::"public"."list_status_enum"
        `);

        // Borrar el enum roto
        await queryRunner.query(`DROP TYPE "public"."list_status_enum_failed"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // No implementamos down porque queremos quedarnos en este estado seguro
    }

}
