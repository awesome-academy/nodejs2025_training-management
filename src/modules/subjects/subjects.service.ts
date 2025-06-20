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
import { TaskService } from '@modules/tasks/task.service';
import { Task } from '@modules/tasks/entity/task.entity';
import { EntityManager, ILike, UpdateResult } from 'typeorm';
import { UpdateSubjectDto, UpdateSubjectTask } from './dto/updateSubject.dto';
import { User } from '@modules/users/entity/user.entity';
import { AppResponse, FindAllResponse } from 'src/types/common.type';
import { getLimitAndSkipHelper } from 'src/helper/pagination.helper';
import { FindSubjectDto } from './dto/find.dto';
import { SubjectResponseDto } from './dto/subjectResponse.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class SubjectService extends BaseServiceAbstract<Subject> {
    constructor(
        @Inject('SUBJECT_REPOSITORY')
        private readonly subjectRepository: SubjectRepository,
        @Inject(forwardRef(() => TaskService))
        private readonly taskService: TaskService,
    ) {
        super(subjectRepository);
    }

    async getSubjectList(dto: FindSubjectDto, user: User): Promise<AppResponse<FindAllResponse<Subject>>> {
        const { page, pageSize, name } = dto;
        const { limit, skip } = getLimitAndSkipHelper(page, pageSize);

        const condition: any = {
            creator: {
                id: user.id,
            },
        };
        if (name) {
            condition.name = ILike(`%${name}%`);
        }

        const result = await this.subjectRepository.findAll(condition, {
            skip,
            take: limit,
            order: {
                createdAt: 'DESC',
            },
        });

        return {
            data: result,
        };
    }

    async getSubjectDetail(subjectId: string, user: User): Promise<AppResponse<SubjectResponseDto>> {
        const subject = await this.subjectRepository.findOneByCondition(
            {
                id: subjectId,
            },
            {
                relations: ['tasksCreated', 'creator'],
            },
        );

        if (!subject) {
            throw new NotFoundException('subjects.Subject Not Found');
        }

        if (subject.creator.id !== user.id) {
            throw new ForbiddenException('Forbidden Resource');
        }

        return {
            data: plainToInstance(SubjectResponseDto, subject),
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
        const transaction = await this.subjectRepository.startTransaction();
        try {
            const newSubject = await this.subjectRepository.create(
                {
                    name,
                    description,
                    creator: user,
                },
                undefined,
                transaction.manager,
            );
            const subjectId: string = newSubject.id;
            await this._addTaskForSubject(tasks, subjectId, transaction.manager);
            await transaction.commitTransaction();
            return {
                data: newSubject,
            };
        } catch (error) {
            await transaction.rollbackTransaction();
            throw new UnprocessableEntityException(error);
        } finally {
            await transaction.release();
        }
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
        if (subject && subjectId !== subject.id) {
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

    async _addTaskForSubject(
        tasks: TaskDto[],
        subjectId: string,
        manager?: EntityManager,
    ): Promise<AppResponse<Task[]>> {
        const checkSubjectIsStudyByTrainee = await this._checkSubjectIsStudyByTrainee(subjectId, manager);
        if (checkSubjectIsStudyByTrainee) {
            throw new UnprocessableEntityException('subjects.Can not adujst this subject');
        }
        if (tasks.length === 0) {
            throw new UnprocessableEntityException('subjects.At least one task is required');
        }
        const tasksData: Promise<Task>[] = tasks.map((task: TaskDto): Promise<Task> => {
            return this.taskService.createTask(
                {
                    contentFileLink: task.contentFileLink,
                    subjectId: subjectId,
                    title: task.title,
                },
                manager,
            );
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
        const checkSubjectIsStudyByTrainee = await this._checkSubjectIsStudyByTrainee(subjectId);
        if (checkSubjectIsStudyByTrainee) {
            throw new UnprocessableEntityException('subjects.Can not adujst this subject');
        }
        const subject = await this.subjectRepository.findOneById(subjectId, { relations: ['creator'] });
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

    async _checkSubjectIsStudyByTrainee(subjectId: string, manager?: EntityManager): Promise<boolean> {
        const subject = await this.subjectRepository.findOneByCondition(
            { id: subjectId },
            { relations: ['courseSubjects', 'courseSubjects.userSubjects'] },
            manager,
        );

        if (!subject) {
            throw new NotFoundException(`Subject with id ${subjectId} not found`);
        }

        return subject.courseSubjects.some((courseSubject) => courseSubject.userSubjects.length > 0);
    }
}
