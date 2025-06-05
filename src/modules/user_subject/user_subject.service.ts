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
import { UserCourseService } from '@modules/user_course/user_course.service';

@Injectable()
export class UserSubjectService extends BaseServiceAbstract<UserSubject> {
    constructor(
        @Inject('USER_SUBJECT_REPOSITORY')
        private readonly userSubjectRepository: UserSubjectRepository,
        private readonly userTaskService: UserTaskService,
        private readonly userCourseService: UserCourseService,
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
        const userSubject = await this._checkTraineeCanUpdateStatus(userSubjectId, trainee);
        if (!userSubject) {
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

            await this.updateProgressForCourse(userSubject);

            return { data: updateResult };
        } catch (error) {
            console.error('Failed to finish subject:', error);
            throw new UnprocessableEntityException('courses.Failed to finish subject');
        }
    }

    private async _checkTraineeCanUpdateStatus(userSubjectId: string, trainee: User): Promise<UserSubject | null> {
        const userSubject = await this.userSubjectRepository.findOneByCondition(
            {
                id: userSubjectId,
            },
            {
                relations: ['user', 'courseSubject', 'courseSubject.course'],
            },
        );
        if (!userSubject || userSubject.user.id !== trainee.id) {
            return null;
        }

        return userSubject;
    }

    async updateProgressForCourse(userSubject: UserSubject) {
        const userId = userSubject.user.id;
        const courseId = userSubject.courseSubject.course.id;
        const { total, finished } = await this._countSubjects(userId, courseId);
        const progress = total > 0 ? parseFloat(((finished / total) * 100).toFixed(2)) : 0;
        await this.userCourseService.updateUserCourseProgress(courseId, userId, progress, total === finished);
    }

    private async _countSubjects(userId: string, courseId: string): Promise<{ total: number; finished: number }> {
        const query = this.userSubjectRepository
            .createQueryBuilder('userSubject')
            .innerJoin('userSubject.courseSubject', 'courseSubject')
            .innerJoin('courseSubject.course', 'course')
            .where('userSubject.userId = :userId', { userId })
            .andWhere('course.id = :courseId', { courseId });

        const [total, finished] = await Promise.all([
            query.getCount(),
            query
                .andWhere('userSubject.status = :status', {
                    status: EUserSubjectStatus.FINISH,
                })
                .getCount(),
        ]);

        return { total, finished };
    }
}
