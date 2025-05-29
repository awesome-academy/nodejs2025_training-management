import { MigrationInterface, QueryRunner } from "typeorm";

export class AdjustUserCourseStatusValue1748482606314 implements MigrationInterface {
    name = 'AdjustUserCourseStatusValue1748482606314'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_task" DROP COLUMN "taskProgress"`);
        await queryRunner.query(`ALTER TABLE "user_subject" DROP COLUMN "subjectProgress"`);
        await queryRunner.query(`ALTER TABLE "task" ADD "title" character varying(120) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "task" ADD CONSTRAINT "UQ_3399e2710196ea4bf734751558f" UNIQUE ("title")`);
        await queryRunner.query(`ALTER TABLE "course_subject" DROP CONSTRAINT "FK_1df931b5b9e84dc8a0e77887af9"`);
        await queryRunner.query(`ALTER TABLE "course_subject" DROP CONSTRAINT "FK_4211adbd2dedfd07cf2e2adc3b1"`);
        await queryRunner.query(`ALTER TABLE "course_subject" ALTER COLUMN "subjectId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "course_subject" ALTER COLUMN "courseId" SET NOT NULL`);
        await queryRunner.query(`ALTER TYPE "public"."user_course_status_enum" RENAME TO "user_course_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."user_course_status_enum" AS ENUM('FAIL', 'PASS', 'RESIGN', 'IN_PROGRESS', 'INACTIVE')`);
        await queryRunner.query(`ALTER TABLE "user_course" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "user_course" ALTER COLUMN "status" TYPE "public"."user_course_status_enum" USING "status"::"text"::"public"."user_course_status_enum"`);
        await queryRunner.query(`ALTER TABLE "user_course" ALTER COLUMN "status" SET DEFAULT 'RESIGN'`);
        await queryRunner.query(`DROP TYPE "public"."user_course_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "course" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'`);
        await queryRunner.query(`ALTER TABLE "course" ALTER COLUMN "image" SET DEFAULT 'https://i.ytimg.com/vi/Oe421EPjeBE/maxresdefault.jpg'`);
        await queryRunner.query(`ALTER TABLE "course_subject" ADD CONSTRAINT "UQ_6c46350ca1c7b93ac1cdf28adf4" UNIQUE ("subjectId", "courseId")`);
        await queryRunner.query(`ALTER TABLE "course_subject" ADD CONSTRAINT "FK_4211adbd2dedfd07cf2e2adc3b1" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "course_subject" ADD CONSTRAINT "FK_1df931b5b9e84dc8a0e77887af9" FOREIGN KEY ("subjectId") REFERENCES "subject"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "course_subject" DROP CONSTRAINT "FK_1df931b5b9e84dc8a0e77887af9"`);
        await queryRunner.query(`ALTER TABLE "course_subject" DROP CONSTRAINT "FK_4211adbd2dedfd07cf2e2adc3b1"`);
        await queryRunner.query(`ALTER TABLE "course_subject" DROP CONSTRAINT "UQ_6c46350ca1c7b93ac1cdf28adf4"`);
        await queryRunner.query(`ALTER TABLE "course" ALTER COLUMN "image" SET DEFAULT 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSmhsQhiqmHF_i2Cli8YrXow7xhEjVqcTKTjw&s'`);
        await queryRunner.query(`ALTER TABLE "course" ALTER COLUMN "status" SET DEFAULT 'DISABLED'`);
        await queryRunner.query(`CREATE TYPE "public"."user_course_status_enum_old" AS ENUM('FAIL', 'PASS', 'RESIGN', 'IN_PROGRESS')`);
        await queryRunner.query(`ALTER TABLE "user_course" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "user_course" ALTER COLUMN "status" TYPE "public"."user_course_status_enum_old" USING "status"::"text"::"public"."user_course_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "user_course" ALTER COLUMN "status" SET DEFAULT 'RESIGN'`);
        await queryRunner.query(`DROP TYPE "public"."user_course_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."user_course_status_enum_old" RENAME TO "user_course_status_enum"`);
        await queryRunner.query(`ALTER TABLE "course_subject" ALTER COLUMN "courseId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "course_subject" ALTER COLUMN "subjectId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "course_subject" ADD CONSTRAINT "FK_4211adbd2dedfd07cf2e2adc3b1" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "course_subject" ADD CONSTRAINT "FK_1df931b5b9e84dc8a0e77887af9" FOREIGN KEY ("subjectId") REFERENCES "subject"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task" DROP CONSTRAINT "UQ_3399e2710196ea4bf734751558f"`);
        await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "title"`);
        await queryRunner.query(`ALTER TABLE "user_subject" ADD "subjectProgress" double precision NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "user_task" ADD "taskProgress" double precision NOT NULL DEFAULT '0'`);
    }

}
