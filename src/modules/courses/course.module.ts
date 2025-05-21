import { forwardRef, Module } from '@nestjs/common';
import { DatabaseModule } from '@modules/databases/databases.module';
import { SharedModule } from '@modules/shared/shared.module';
import { CourseService } from './course.service';
import { courseProviders } from './cousre.provider';
import { SupervisorCourseModule } from '@modules/supervisor_course/supervisor_course.module';
import { CourseSubjectModule } from '@modules/course_subject/course_subject.module';
import { UserModule } from '@modules/users/user.module';
import { CourseController } from './course.controller';
import { UserCourseModule } from '@modules/user_course/user_course.module';
import { UserSubjectModule } from '@modules/user_subject/user_subject.module';
import { UserTaskModule } from '@modules/user_task/user_task.module';

@Module({
    imports: [
        DatabaseModule,
        SharedModule,
        forwardRef(() => SupervisorCourseModule),
        CourseSubjectModule,
        UserModule,
        UserCourseModule,
        UserSubjectModule,
        UserTaskModule,
    ],
    providers: [...courseProviders, CourseService],
    controllers: [CourseController],
    exports: [CourseService],
})
export class CourseModule {}
