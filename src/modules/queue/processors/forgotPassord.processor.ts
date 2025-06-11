import { MailerService } from '@nestjs-modules/mailer';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ForgotPasswordType } from '../types/index.type';
import { EQueueName } from '../enum/index.enum';
import { ConfigService } from '@nestjs/config';

@Processor(EQueueName.ForgotPassword)
export class ForgotProcessor extends WorkerHost {
    private _fromEmail;
    constructor(
        private readonly mailService: MailerService,
        private readonly configService: ConfigService,
    ) {
        super();
        this._fromEmail = configService.get<string>('MAIL_USER');
    }

    async process(job: Job<ForgotPasswordType>): Promise<void> {
        const { email, link } = job.data;
        await this.mailService.sendMail({
            from: this._fromEmail,
            to: email,
            subject: 'Reset Your Password',
            html: `
                <p>Hello,</p>
                <p>Please click the link below to reset your password:</p>
                <a href="${link}">Reset Password</a>
                <p>If you did not request this, please ignore this email.</p>
            `,
        });
    }
}
