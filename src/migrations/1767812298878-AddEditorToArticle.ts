import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEditorToArticle1767812298878 implements MigrationInterface {
    name = 'AddEditorToArticle1767812298878'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "article" ADD "editorId" uuid`);
        await queryRunner.query(`ALTER TABLE "article" ADD CONSTRAINT "FK_021ce4f1155af87f1a27d9ec54a" FOREIGN KEY ("editorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "article" DROP CONSTRAINT "FK_021ce4f1155af87f1a27d9ec54a"`);
        await queryRunner.query(`ALTER TABLE "article" DROP COLUMN "editorId"`);
    }

}
