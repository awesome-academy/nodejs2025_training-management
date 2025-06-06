import { ForbiddenException, forwardRef, Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { BaseServiceAbstract } from 'src/services/base/base.abstract.service';
import { Task } from './entity/task.entity';
import { TaskRepository } from '@repositories/task.repository';
import { CreateTaskDto } from './dto/createTask.dto';
import { EntityManager, UpdateResult } from 'typeorm';
import { UpdateTaskDto } from './dto/updateTask.dto';
import { SubjectService } from '@modules/subjects/subjects.service';
import { AppResponse } from 'src/types/common.type';
import { User } from '@modules/users/entity/user.entity';

@Injectable()
export class TaskService extends BaseServiceAbstract<Task> {
    constructor(
        @Inject('TASK_REPOSITORY')
        private readonly taskRepository: TaskRepository,
        @Inject(forwardRef(() => SubjectService))
        private readonly subjectService: SubjectService,
    ) {
        super(taskRepository);
    }

    async createTask(dto: CreateTaskDto, manager?: EntityManager): Promise<Task> {
        const { subjectId, title } = dto;
        const task = await this.taskRepository.findOneByCondition(
            {
                subject: { id: subjectId },
                title,
            },
            undefined,
            manager,
        );
        if (task) {
            throw new UnprocessableEntityException('tasks.This task name is exsisted');
        }
        try {
            return await this.taskRepository.create(
                {
                    contentFileLink: dto.contentFileLink,
                    subject: { id: subjectId },
                    title,
                },
                undefined,
                manager,
            );
        } catch (error) {
            throw new UnprocessableEntityException('tasks.Error happen');
        }
    }

    async buildCreateNewTaskResponse(dto: CreateTaskDto): Promise<AppResponse<Task>> {
        return {
            data: await this.createTask(dto),
        };
    }

    async deleteTaskBySubjectId(subjectId: string): Promise<AppResponse<UpdateResult>> {
        return {
            data: await this.taskRepository.softDeleteMany({
                subject: {
                    id: subjectId,
                },
            }),
        };
    }

    async updateTask(taskId: string, dto: UpdateTaskDto): Promise<AppResponse<UpdateResult>> {
        if (this._checkTaskIsStudyByTrainee(taskId)) {
            throw new UnprocessableEntityException('tasks.Another trainee is currently studying this task');
        }
        try {
            return {
                data: await this.taskRepository.update(taskId, dto),
            };
        } catch (error) {
            throw new UnprocessableEntityException('Invalid Data');
        }
    }

    async deleteTaskById(taskId: string, user: User): Promise<AppResponse<UpdateResult>> {
        if (this._checkTaskIsStudyByTrainee(taskId)) {
            throw new UnprocessableEntityException('tasks.Another trainee is currently studying this task');
        }
        const task = await this.taskRepository.findOneByCondition(
            {
                id: taskId,
            },
            {
                relations: ['subject', 'subject.creator'],
            },
        );
        if (!task || !task.subject || !task.subject.creator || task.subject.creator.id !== user.id) {
            throw new ForbiddenException('Forbidden Resource');
        }
        return {
            data: await this.taskRepository.softDelete(taskId),
        };
    }

    async _checkTaskIsStudyByTrainee(taskId: string) {
        const task = await this.taskRepository.findOneByCondition(
            {
                id: taskId,
            },
            {
                relations: ['userTasks'],
            },
        );
        return task.userTasks.length > 0;
    }
}
