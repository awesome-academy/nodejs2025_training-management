import { EUserCourseStatus } from '@modules/user_course/enum/index.enum';
import { ENotificationTraineeEnum, ENotificationType, EQueueName } from '../enum/index.enum';

export type VerifyCodeType = {
    code: string;
    email: string;
};

export type NotificationTraineeJobType = {
    type: ENotificationTraineeEnum;
    email: string;
    courseName: string;
};

export type CourseNotificationType = {
    supervisorsEmail: string[];
    courseName: string;
};

export type TraineeInfo = {
    name: string;
    email: string;
    progress: number;
    status: EUserCourseStatus;
};

export type TraineeProgressNotificationType = {
    supervisorEmail: string;
    courseName: string;
    traineesInfo: TraineeInfo[];
};

export type NotificationType = (
    | NotificationTraineeJobType
    | CourseNotificationType
    | TraineeProgressNotificationType
) & {
    notificationType: ENotificationType;
};

export type ForgotPasswordType = {
    email: string;
    link: string;
};

export type QueueDateType = (NotificationType | VerifyCodeType | ForgotPasswordType) & {
    queueName: EQueueName;
};
