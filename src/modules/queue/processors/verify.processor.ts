import { MailerService } from '@nestjs-modules/mailer';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';

@Processor('verify-email')
export class VerifyProcessor extends WorkerHost {
    private _fromMail: string;
    constructor(
        private readonly mailService: MailerService,
        private readonly configService: ConfigService,
    ) {
        super();
        this._fromMail = configService.get<string>('MAIL_USER');
    }

    async process(job: Job<any>): Promise<void> {
        await this.mailService.sendMail({
            from: this._fromMail,
            to: job.data.email,
            subject: `Verify your email`,
            text: `Please enter the code bellow here to verify your email: ${job.data.code}`,
        });
    }
}
