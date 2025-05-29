import { Module } from '@nestjs/common';
import { DatabaseModule } from '@modules/databases/databases.module';
import { SharedModule } from '@modules/shared/shared.module';
import { UserSubjectService } from './user_subject.service';
import { userSubjectProviders } from './user_subject.provider';
import { UserTaskModule } from '@modules/user_task/user_task.module';
import { UserSubjectController } from './user_subject.controller';

@Module({
    imports: [DatabaseModule, SharedModule, UserTaskModule],
    providers: [...userSubjectProviders, UserSubjectService],
    controllers: [UserSubjectController],
    exports: [UserSubjectService],
})
export class UserSubjectModule {}
