import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueDateType, TraineeInfo } from './types/index.type';
import { Cron } from '@nestjs/schedule';
import { ECronJobExpression } from './cronJobExpression/index.expression';
import { SupervisorCourseService } from '@modules/supervisor_course/supervisor_course.service';
import { CourseService } from '@modules/courses/course.service';
import { SupervisorCourse } from '@modules/supervisor_course/entity/supervisor_course.entity';
import { ENotificationType, EQueueName } from './enum/index.enum';
import { Between } from 'typeorm';
import { Course } from '@modules/courses/entity/course.entity';
import { FindAllResponse } from 'src/types/common.type';

@Injectable()
export class QueueService {
    constructor(
        @InjectQueue('verify-email')
        private readonly verifyQueue: Queue,

        @InjectQueue('notification')
        private readonly notificationQueue: Queue,

        private readonly supervisorCourseSerivce: SupervisorCourseService,

        @Inject(forwardRef(() => CourseService))
        private readonly courseService: CourseService,
    ) {}

    @Cron(ECronJobExpression.SIX_AM_EVERY_DAY)
    async handleCron(): Promise<void> {
        await this._sendNotificationAboutCourseEndingIn2Days();
        if (this._isLastDayOfMonth()) {
            await this._sendMonthlyTraineeReportToSupervisors();
        }
    }

    async addVerifyJob(queueData: QueueDateType) {
        const { queueName, ...data } = queueData;
        switch (queueName) {
            case EQueueName.VerifyEmail:
                await this.verifyQueue.add(queueName, data);
                break;
            case EQueueName.Notification:
                await this.notificationQueue.add(queueName, data);
                break;
        }
    }

    private async _sendMonthlyTraineeReportToSupervisors() {
        const supervisorCourses: SupervisorCourse[] = (
            await this.supervisorCourseSerivce.findAll(undefined, {
                relations: ['user', 'course', 'course.userCourses', 'course.userCourses.user'],
            })
        ).items;

        await Promise.all(
            supervisorCourses.map((supervisorCourse) =>
                this.addVerifyJob({
                    queueName: EQueueName.Notification,
                    notificationType: ENotificationType.AboutTrainee,
                    supervisorEmail: supervisorCourse.user.email,
                    courseName: supervisorCourse.course.name,
                    traineesInfo: this._getTraineeInfo(supervisorCourse),
                }),
            ),
        );
    }

    private async _sendNotificationAboutCourseEndingIn2Days() {
        const courses = await this._findCoursesEndingIn2Days();
        await Promise.all(
            courses.map((course) =>
                this.addVerifyJob({
                    queueName: EQueueName.Notification,
                    notificationType: ENotificationType.Before2DaysEnd,
                    courseName: course.name,
                    supervisorsEmail: this._getSupervisorEmail(course),
                }),
            ),
        );
    }

    private async _findCoursesEndingIn2Days(): Promise<Course[]> {
        const now = new Date();
        const targetDate = new Date();
        targetDate.setDate(now.getDate() + 2);

        const startOfTargetDay = new Date(targetDate);
        startOfTargetDay.setHours(0, 0, 0, 0);

        const endOfTargetDay = new Date(targetDate);
        endOfTargetDay.setHours(23, 59, 59, 999);

        const courses: FindAllResponse<Course> = await this.courseService.findAll(
            {
                endDate: Between(startOfTargetDay, endOfTargetDay),
            },
            {
                relations: ['supervisorCourses', 'supervisorCourses.user'],
            },
        );

        return courses.items;
    }

    private _getSupervisorEmail(course: Course): string[] {
        return course.supervisorCourses.map((supervisorCourse) => supervisorCourse.user.email);
    }

    private _getTraineeInfo(supervisorCourse: SupervisorCourse): TraineeInfo[] {
        return supervisorCourse.course.userCourses.map((userCourse) => ({
            name: userCourse.user.name,
            email: userCourse.user.email,
            progress: userCourse.courseProgress,
            status: userCourse.status,
        }));
    }

    private _isLastDayOfMonth(date: Date = new Date()): boolean {
        const today = date.getDate();
        const month = date.getMonth();
        const year = date.getFullYear();

        const tomorrow = new Date(year, month, today + 1);
        return tomorrow.getDate() === 1;
    }
}
