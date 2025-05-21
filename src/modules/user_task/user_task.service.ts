import { Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { BaseServiceAbstract } from 'src/services/base/base.abstract.service';
import { UserTask } from './entity/user_task.entity';
import { UserTaskRepository } from '@repositories/user_task.repository';
import { UserSubject } from '@modules/user_subject/entity/user_subject.entity';
import { Task } from '@modules/tasks/entity/task.entity';

@Injectable()
export class UserTaskService extends BaseServiceAbstract<UserTask> {
    constructor(
        @Inject('USER_TASK_REPOSITORY')
        private readonly userTaskRepository: UserTaskRepository,
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
            console.log(error);
            throw new UnprocessableEntityException('course.Error happens when creating subject for trainee');
        }
    }
}
