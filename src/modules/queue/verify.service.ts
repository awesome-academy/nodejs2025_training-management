import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class VerifyService {
    constructor(
        @InjectQueue('verify-email')
        private readonly jobQueue: Queue,
    ) {}

    async addVerifyJob(data: any) {
        await this.jobQueue.add('verify-email', data);
    }
}
