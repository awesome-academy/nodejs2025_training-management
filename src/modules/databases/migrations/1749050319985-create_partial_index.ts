import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePartialIndex1749050319985 implements MigrationInterface {
    name = 'CreatePartialIndex1749050319985'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task" RENAME COLUMN "deletedAt" TO "deleted_at"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "unique_title_not_deleted" ON "task" ("title") WHERE "deleted_at" IS NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."unique_title_not_deleted"`);
        await queryRunner.query(`ALTER TABLE "task" RENAME COLUMN "deleted_at" TO "deletedAt"`);
    }

}
