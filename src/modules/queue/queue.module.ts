import { forwardRef, Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { VerifyProcessor } from './processors/verify.processor';
import { BullModule } from '@nestjs/bullmq';
import { SupervisorCourseModule } from '@modules/supervisor_course/supervisor_course.module';
import { CourseModule } from '@modules/courses/course.module';
import { NotificationProcessor } from './processors/notification.processor';
import { EQueueName } from './enum/index.enum';
import { ForgotProcessor } from './processors/forgotPassord.processor';

@Module({
    imports: [
        BullModule.registerQueue({
            name: EQueueName.VerifyEmail,
        }),
        BullModule.registerQueue({
            name: EQueueName.Notification,
        }),
        BullModule.registerQueue({
            name: EQueueName.ForgotPassword,
        }),
        forwardRef(() => SupervisorCourseModule),
        forwardRef(() => CourseModule),
    ],
    exports: [QueueService, VerifyProcessor, NotificationProcessor, ForgotProcessor],
    providers: [QueueService, VerifyProcessor, NotificationProcessor, ForgotProcessor],
})
export class QueueModule {}
