import { ForbiddenException, Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { BaseServiceAbstract } from 'src/services/base/base.abstract.service';
import { UserSubject } from './entity/user_subject.entity';
import { UserSubjectRepository } from '@repositories/user_subject.repository';
import { User } from '@modules/users/entity/user.entity';
import { AppResponse } from 'src/types/common.type';
import { In, UpdateResult } from 'typeorm';
import { UserTaskService } from '@modules/user_task/user_task.service';
import { EUserTaskStatus } from '@modules/user_task/enum/index.enum';
import { EUserSubjectStatus } from './enum/index.enum';

@Injectable()
export class UserSubjectService extends BaseServiceAbstract<UserSubject> {
    constructor(
        @Inject('USER_SUBJECT_REPOSITORY')
        private readonly userSubjectRepository: UserSubjectRepository,
        private readonly userTaskService: UserTaskService,
    ) {
        super(userSubjectRepository);
    }

    async addTraineeForUserSubject(courseSubjectId: string, trainee: User): Promise<UserSubject> {
        return this.userSubjectRepository.create({
            courseSubject: { id: courseSubjectId },
            user: { id: trainee.id },
        });
    }

    async finishSubjectForTrainee(userSubjectId: string, trainee: User): Promise<AppResponse<UpdateResult>> {
        const isAuthorized = await this._checkTraineeCanUpdateStatus(userSubjectId, trainee);
        if (!isAuthorized) {
            throw new ForbiddenException('auths.Forbidden Resource');
        }

        const userTasks = await this.userTaskService.findAll({
            userSubject: { id: userSubjectId },
        });

        const userTaskIds = userTasks.items.map((task) => task.id);

        try {
            await this.userTaskService.updateMany({ id: In(userTaskIds) }, { status: EUserTaskStatus.FINISH });

            const updateResult = await this.userSubjectRepository.update(userSubjectId, {
                status: EUserSubjectStatus.FINISH,
            });

            return { data: updateResult };
        } catch (error) {
            console.error('Failed to finish subject:', error);
            throw new UnprocessableEntityException('courses.Failed to finish subject');
        }
    }

    private async _checkTraineeCanUpdateStatus(userSubjectId: string, trainee: User): Promise<boolean> {
        const userSubject = await this.userSubjectRepository.findOneByCondition(
            {
                id: userSubjectId,
            },
            {
                relations: ['user'],
            },
        );
        if (!userSubject || userSubject.user.id !== trainee.id) {
            return false;
        }
        return true;
    }
}
