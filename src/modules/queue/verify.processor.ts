import { MailerService } from '@nestjs-modules/mailer';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('verify-email')
export class VerifyProcessor extends WorkerHost {
    constructor(private readonly mailService: MailerService) {
        super();
    }

    async process(job: Job<any>): Promise<void> {
        await this.mailService.sendMail({
            from: 'api990573@gmail.com',
            to: job.data.email,
            subject: `Verify your email`,
            text: `Please enter the code bellow here to verify your email: ${job.data.code}`,
        });
    }
}
