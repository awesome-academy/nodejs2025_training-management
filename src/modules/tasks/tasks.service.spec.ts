import { Test, TestingModule } from '@nestjs/testing';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/createTask.dto';
import { taskProviders } from './task.provider';
import { DatabaseModule } from '@modules/databases/databases.module';
import { ConfigModule } from '@nestjs/config';
import * as path from 'path';

describe('TaskService (Real Test DB)', () => {
    let service: TaskService;

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                    envFilePath: path.resolve(process.cwd(), `.env.test`),
                }),
                DatabaseModule,
            ],
            providers: [TaskService, ...taskProviders],
        }).compile();

        service = module.get<TaskService>(TaskService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should create new task', async () => {
        const dto: CreateTaskDto = {
            subjectId: '1205d7aa-489c-4307-b9e4-02cd0f0d4d64',
            title: 'Sample Task',
            contentFileLink: 'https://www.youtube.com/watch?v=2rduCeh-04M',
        };

        const task = await service.createTask(dto);
        expect(task.title).toBe('Sample Task');
        expect(task.subject.id).toBe(dto.subjectId);
    });

    it('should not allow duplicate task titles under same subject', async () => {
        const dto: CreateTaskDto = {
            subjectId: '1205d7aa-489c-4307-b9e4-02cd0f0d4d64',
            title: 'Sample Task',
            contentFileLink: 'http://example.com/another.pdf',
        };

        await expect(service.createTask(dto)).rejects.toThrowError('tasks.This task name is exsisted');
    });
});
