import { forwardRef, Module } from '@nestjs/common';
import { DatabaseModule } from '@modules/databases/databases.module';
import { SharedModule } from '@modules/shared/shared.module';
import { CourseSubjectService } from './course_subject.service';
import { courseSubjectProviders } from './course_subject.provider';
import { SubjectModule } from '@modules/subjects/subjects.module';
import { UserSubjectModule } from '@modules/user_subject/user_subject.module';
import { UserCourseModule } from '@modules/user_course/user_course.module';
import { CourseSubjectController } from './course_subject.controller';
import { SupervisorCourseModule } from '@modules/supervisor_course/supervisor_course.module';

@Module({
    imports: [
        DatabaseModule,
        SharedModule,
        forwardRef(() => SubjectModule),
        UserSubjectModule,
        UserCourseModule,
        SupervisorCourseModule,
    ],
    providers: [...courseSubjectProviders, CourseSubjectService],
    controllers: [CourseSubjectController],
    exports: [CourseSubjectService],
})
export class CourseSubjectModule {}
