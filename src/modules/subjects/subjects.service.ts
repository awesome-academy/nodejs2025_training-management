import {
    ForbiddenException,
    forwardRef,
    Inject,
    Injectable,
    NotFoundException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { BaseServiceAbstract } from 'src/services/base/base.abstract.service';
import { Subject } from './entity/subject.entity';
import { SubjectRepository } from '@repositories/subject.repository';
import { CreateSubjectDto, TaskDto } from './dto/createSubject.dto';
import { UsersService } from '@modules/users/user.services';
import { TaskService } from '@modules/tasks/task.service';
import { Task } from '@modules/tasks/entity/task.entity';
import { UpdateResult } from 'typeorm';
import { UpdateSubjectDto, UpdateSubjectTask } from './dto/updateSubject.dto';
import { User } from '@modules/users/entity/user.entity';
import { AppResponse } from 'src/types/common.type';

@Injectable()
export class SubjectService extends BaseServiceAbstract<Subject> {
    constructor(
        @Inject('SUBJECT_REPOSITORY')
        private readonly subjectRepository: SubjectRepository,
        private readonly userService: UsersService,
        @Inject(forwardRef(() => TaskService))
        private readonly taskService: TaskService,
    ) {
        super(subjectRepository);
    }

    async getSubjectBySupervisor(user: User): Promise<AppResponse<Subject[]>> {
        const subjects = await this.subjectRepository.find(
            {
                creator: { id: user.id },
            },
            {
                relations: ['tasksCreated'],
            },
        );
        return {
            data: subjects,
        };
    }

    async createSubject(dto: CreateSubjectDto, user: User): Promise<AppResponse<Subject>> {
        const { name, description, tasks } = dto;
        const subject = await this.subjectRepository.findOneByCondition({
            name: name,
        });
        if (subject) {
            throw new UnprocessableEntityException('subjects.This subject had exsisted');
        }
        const newSubject = await this.subjectRepository.create({
            name,
            description,
            creator: user,
        });
        const subjectId: string = newSubject.id;
        await this._addTaskForSubject(tasks, subjectId);
        return {
            data: newSubject,
        };
    }

    async updateSubjectInfo(subjectId: string, dto: UpdateSubjectDto): Promise<AppResponse<UpdateResult>> {
        const checkSubjectIsStudyByTrainee = await this._checkSubjectIsStudyByTrainee(subjectId);
        if (checkSubjectIsStudyByTrainee) {
            throw new UnprocessableEntityException('subjects.Can not adujst this subject');
        }
        const { name } = dto;
        const subject = await this.subjectRepository.findOneByCondition({
            name: name,
        });
        if (subject) {
            throw new UnprocessableEntityException('subjects.This subject had exsisted');
        }
        return {
            data: await this.subjectRepository.update(subjectId, dto),
        };
    }

    async addTaskForSubject(subjectId: string, dto: UpdateSubjectTask): Promise<AppResponse<Task[]>> {
        const { tasks } = dto;
        const checkSubjectIsStudyByTrainee = await this._checkSubjectIsStudyByTrainee(subjectId);
        if (checkSubjectIsStudyByTrainee) {
            throw new UnprocessableEntityException('subjects.Can not adujst this subject');
        }
        return await this._addTaskForSubject(tasks, subjectId);
    }

    async _addTaskForSubject(tasks: TaskDto[], subjectId: string): Promise<AppResponse<Task[]>> {
        const checkSubjectIsStudyByTrainee = await this._checkSubjectIsStudyByTrainee(subjectId);
        if (checkSubjectIsStudyByTrainee) {
            throw new UnprocessableEntityException('subjects.Can not adujst this subject');
        }
        if (tasks.length === 0) {
            throw new UnprocessableEntityException('subjects.At least one task is required');
        }
        const tasksData: Promise<Task>[] = tasks.map((task: TaskDto): Promise<Task> => {
            return this.taskService.createTask({
                contentFileLink: task.contentFileLink,
                subjectId: subjectId,
                title: task.title,
            });
        });
        try {
            const taskObjects: Task[] = await Promise.all(tasksData);
            return {
                data: taskObjects,
            };
        } catch (err) {
            throw new UnprocessableEntityException('tasks.Error happen when creating task');
        }
    }

    async deleteSubject(subjectId: string, user: User): Promise<AppResponse<UpdateResult>> {
        if (this._checkSubjectIsStudyByTrainee(subjectId)) {
            throw new UnprocessableEntityException('subjects.Can not adujst this subject');
        }
        const subject = await this.subjectRepository.findOneById(subjectId);
        if (!subject) {
            throw new NotFoundException('subjects.Subject not found');
        }
        if (user.id !== subject.creator.id) {
            throw new ForbiddenException('auths.Unauthorized');
        }
        await this.taskService.deleteTaskBySubjectId(subjectId);
        return {
            data: await this.subjectRepository.softDelete(subjectId),
        };
    }

    async _checkSubjectIsStudyByTrainee(subjectId: string): Promise<boolean> {
        const subject = await this.subjectRepository.findOneByCondition(
            { id: subjectId },
            { relations: ['courseSubjects', 'courseSubjects.userSubjects'] },
        );

        if (!subject) {
            throw new NotFoundException(`Subject with id ${subjectId} not found`);
        }

        return subject.courseSubjects.some((courseSubject) => courseSubject.userSubjects.length > 0);
    }
}
