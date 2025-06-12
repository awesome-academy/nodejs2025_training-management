import { forwardRef, Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { VerifyProcessor } from './processors/verify.processor';
import { BullModule } from '@nestjs/bullmq';
import { SupervisorCourseModule } from '@modules/supervisor_course/supervisor_course.module';
import { CourseModule } from '@modules/courses/course.module';
import { NotificationProcessor } from './processors/notification.processor';

@Module({
    imports: [
        BullModule.registerQueue({
            name: 'verify-email',
        }),
        BullModule.registerQueue({
            name: 'notification',
        }),
        forwardRef(() => SupervisorCourseModule),
        forwardRef(() => CourseModule),
    ],
    exports: [QueueService, VerifyProcessor, NotificationProcessor],
    providers: [QueueService, VerifyProcessor, NotificationProcessor],
})
export class QueueModule {}
