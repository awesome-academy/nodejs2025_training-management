import { forwardRef, Module } from '@nestjs/common';
import { DatabaseModule } from '@modules/databases/databases.module';
import { SharedModule } from '@modules/shared/shared.module';
import { UserTaskService } from './user_task.service';
import { userTaskProviders } from './user_task.provider';
import { UserTaskController } from './user_task.controller';
import { UserSubjectModule } from '@modules/user_subject/user_subject.module';

@Module({
    imports: [DatabaseModule, SharedModule, forwardRef(() => UserSubjectModule)],
    providers: [...userTaskProviders, UserTaskService],
    controllers: [UserTaskController],
    exports: [UserTaskService],
})
export class UserTaskModule {}
