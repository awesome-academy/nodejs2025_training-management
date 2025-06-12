import { MailerService } from '@nestjs-modules/mailer';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
    CourseNotificationType,
    NotificationTraineeJobType,
    NotificationType,
    TraineeInfo,
    TraineeProgressNotificationType,
} from '../types/index.type';
import { ENotificationTraineeEnum, ENotificationType, EQueueName } from '../enum/index.enum';
import * as path from 'path';
import * as pug from 'pug';
import { ConfigService } from '@nestjs/config';

@Processor(EQueueName.Notification)
export class NotificationProcessor extends WorkerHost {
    private _fromMail: string;
    constructor(
        private readonly mailService: MailerService,
        private readonly configService: ConfigService,
    ) {
        super();
        this._fromMail = configService.get<string>('MAIL_USER');
    }
    async process(job: Job<NotificationType>): Promise<void> {
        const { notificationType, ...data } = job.data;
        switch (notificationType) {
            case ENotificationType.AboutTrainee:
                await this._sendNotificationForSupervisorAboutTrainee(data as TraineeProgressNotificationType);
                break;
            case ENotificationType.TraineeAddOrRemove:
                await this._sendNotificationForTrainee(data as NotificationTraineeJobType);
                break;
            case ENotificationType.Before2DaysEnd:
                await this._sendNotificationForSupervisorAboutCourseBefore2DaysEnd(data as CourseNotificationType);
                break;
        }
    }

    private async _sendNotificationForSupervisorAboutCourseBefore2DaysEnd(data: CourseNotificationType): Promise<void> {
        const { supervisorsEmail, courseName } = data;
        await Promise.all(
            supervisorsEmail.map((email) => {
                return this.mailService.sendMail({
                    from: this._fromMail,
                    to: email,
                    subject: 'Reminder: Course is ending in 2 days',
                    text: this._getMessageForSupervisorAboutCourse(courseName),
                });
            }),
        );
    }

    private async _sendNotificationForTrainee(data: NotificationTraineeJobType): Promise<void> {
        const { type, courseName } = data;
        await this.mailService.sendMail({
            from: this._fromMail,
            to: data.email,
            subject: `Verify your email`,
            text: this._getMessageForTraineeByType(type, courseName),
        });
    }

    private async _sendNotificationForSupervisorAboutTrainee(data: TraineeProgressNotificationType): Promise<void> {
        const { courseName, traineesInfo, supervisorEmail } = data;

        try {
            await this.mailService.sendMail({
                from: this._fromMail,
                to: supervisorEmail,
                subject: `Course Summary: "${courseName}" - Trainee Progress`,
                html: this._renderHtml(courseName, traineesInfo),
            });
        } catch (error) {
            console.log(error);
        }
    }

    private _getMessageForTraineeByType(type: ENotificationTraineeEnum, courseName: string): string {
        switch (type) {
            case ENotificationTraineeEnum.ADD:
                return `You have just been added to the course ${courseName}`;
            case ENotificationTraineeEnum.REMOVE:
                return `You have just been removed to the course ${courseName}`;
        }
    }

    private _getMessageForSupervisorAboutCourse(courseName: string): string {
        return `Dear Supervisor,
            This is a reminder that the course "${courseName}" will end in 2 days.
            Please ensure that all related evaluations, reports, or required actions are completed in a timely manner.
            Thank you for your attention.
            Best regards,
            Training Management System`;
    }

    private _renderHtml(courseName: string, trainees: TraineeInfo[]): string {
        const filePath = path.resolve('src/views/template/trainee-summary-email.pug');
        const html = pug.renderFile(filePath, {
            courseName,
            trainees,
        });
        return html;
    }
}
