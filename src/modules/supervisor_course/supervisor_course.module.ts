import { Module } from '@nestjs/common';
import { DatabaseModule } from '@modules/databases/databases.module';
import { SharedModule } from '@modules/shared/shared.module';
import { SupervisorCourseService } from './supervisor_course.service';
import { supervisorCourseProviders } from './supervisor_course.provider';
import { SupervisorCourseController } from './supervisor_course.controller';

@Module({
    imports: [DatabaseModule, SharedModule],
    providers: [...supervisorCourseProviders, SupervisorCourseService],
    controllers: [SupervisorCourseController],
    exports: [SupervisorCourseService],
})
export class SupervisorCourseModule {}
