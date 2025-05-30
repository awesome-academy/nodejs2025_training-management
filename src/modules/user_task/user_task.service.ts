import { ForbiddenException, forwardRef, Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { BaseServiceAbstract } from 'src/services/base/base.abstract.service';
import { UserTask } from './entity/user_task.entity';
import { UserTaskRepository } from '@repositories/user_task.repository';
import { UserSubject } from '@modules/user_subject/entity/user_subject.entity';
import { Task } from '@modules/tasks/entity/task.entity';
import { EUserTaskStatus } from './enum/index.enum';
import { AppResponse } from 'src/types/common.type';
import { UpdateResult } from 'typeorm';
import { User } from '@modules/users/entity/user.entity';
import { UserSubjectService } from '@modules/user_subject/user_subject.service';
import { EUserSubjectStatus } from '@modules/user_subject/enum/index.enum';
import { FinishTaskResponseType } from './types/FinishTaskResponse.type';

@Injectable()
export class UserTaskService extends BaseServiceAbstract<UserTask> {
    constructor(
        @Inject('USER_TASK_REPOSITORY')
        private readonly userTaskRepository: UserTaskRepository,
        @Inject(forwardRef(() => UserSubjectService))
        private readonly userSubjectService: UserSubjectService,
    ) {
        super(userTaskRepository);
    }

    async handleCreateUserTask(userSubjects: UserSubject, tasks: Task[]): Promise<UserTask[]> {
        const taskPromise = tasks.map((task) => {
            return this.userTaskRepository.create({
                userSubject: { id: userSubjects.id },
                task: { id: task.id },
            });
        });
        try {
            return Promise.all(taskPromise);
        } catch (error) {
            throw new UnprocessableEntityException('courses.Error happens when creating subject for trainee');
        }
    }

    async updateStatusForUser(userTaskId: string, user: User): Promise<AppResponse<FinishTaskResponseType>> {
        const userSubject = await this._checkUserCanUpdateStatusAndReturnUserSubject(userTaskId, user);
        if (!userSubject) {
            throw new ForbiddenException('auths.Forbidden Resource');
        }
        const userTaskUpdated: UpdateResult = await this.userTaskRepository.update(userTaskId, {
            status: EUserTaskStatus.FINISH,
        });
        const numberOfTaskIsNotFinish = await this._countNumberTaskOfSubjectIsNotFinish(userSubject.id);
        if (numberOfTaskIsNotFinish === 0) {
            await this.userSubjectService.update(userSubject.id, {
                status: EUserSubjectStatus.FINISH,
            });
            await this.userSubjectService.updateProgressForCourse(userSubject);
        }
        return {
            data: { ...userTaskUpdated, isSubjectFinish: numberOfTaskIsNotFinish === 0 },
        };
    }

    private async _checkUserCanUpdateStatusAndReturnUserSubject(
        userTaskId: string,
        user: User,
    ): Promise<UserSubject | null> {
        const userTask = await this.userTaskRepository.findOneByCondition(
            { id: userTaskId },
            {
                relations: [
                    'userSubject',
                    'userSubject.user',
                    'userSubject.courseSubject',
                    'userSubject.courseSubject.course',
                ],
            },
        );
        if (
            !userTask ||
            !userTask.userSubject ||
            !userTask.userSubject.user ||
            userTask.userSubject.user.id !== user.id
        ) {
            return null;
        }

        return userTask.userSubject;
    }

    private async _countNumberTaskOfSubjectIsNotFinish(userSubjectId: string): Promise<number> {
        const userTask = await this.userTaskRepository.findAll({
            userSubject: { id: userSubjectId },
            status: EUserTaskStatus.NOT_FINISH,
        });
        return userTask.items.length;
    }
}
