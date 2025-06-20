import { Test, TestingModule } from '@nestjs/testing';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/createTask.dto';
import { taskProviders } from './task.provider';
import { DatabaseModule } from '@modules/databases/databases.module';
import { ConfigModule } from '@nestjs/config';
import * as path from 'path';
import { TaskRepository } from '@repositories/task.repository';
import { SubjectRepository } from '@repositories/subject.repository';
import { DataSource } from 'typeorm';
import { UserRepository } from '@repositories/user.repository';
import { User } from '@modules/users/entity/user.entity';
import { ERolesUser, EStatusUser } from '@modules/users/enums/index.enum';
import { Subject } from '@modules/subjects/entity/subject.entity';
import { UnprocessableEntityException } from '@nestjs/common';

describe('TaskService (Real Test DB)', () => {
    let service: TaskService;
    let repo: TaskRepository;
    let subjectRepo: SubjectRepository;
    let userRepo: UserRepository;

    const getInfoTestUserByRole = (role: ERolesUser): { name: string; email: string } => {
        switch (role) {
            case ERolesUser.SUPERVISOR:
                return { name: 'Supervisor Test', email: 'testsupervisor@gmail.com' };
            case ERolesUser.TRAINEE:
                return { name: 'Trainee Test', email: 'testtrainee@gmail.com' };
        }
    };

    const createSubject = async (user: User, name?: string): Promise<Subject> => {
        return subjectRepo.create({
            description: 'Subject Description',
            name: name ?? randomName(),
            creator: {
                id: user.id,
            },
        });
    };

    const createTestUser = async (role: ERolesUser): Promise<User> => {
        return await userRepo.create({
            status: EStatusUser.ACTIVE,
            role,
            password: '123456',
            ...getInfoTestUserByRole(role),
        });
    };

    const randomName = (length: number = 10): string => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * chars.length);
            result += chars[randomIndex];
        }
        return result;
    };

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                    envFilePath: path.resolve(process.cwd(), `.env.test`),
                }),
                DatabaseModule,
            ],
            providers: [
                TaskService,
                ...taskProviders,
                {
                    provide: 'SUBJECT_REPOSITORY',
                    useFactory: (dataSource: DataSource) => new SubjectRepository(dataSource),
                    inject: ['DATA_SOURCE'],
                },
                {
                    provide: 'USER_REPOSITORY',
                    useFactory: (dataSource: DataSource) => new UserRepository(dataSource),
                    inject: ['DATA_SOURCE'],
                },
            ],
        }).compile();

        service = module.get<TaskService>(TaskService);
        repo = module.get<TaskRepository>('TASK_REPOSITORY');
        subjectRepo = module.get<SubjectRepository>('SUBJECT_REPOSITORY');
        userRepo = module.get<UserRepository>('USER_REPOSITORY');
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should create new task', async () => {
        const supervisor = await createTestUser(ERolesUser.SUPERVISOR);
        const subjectName = randomName();
        const subject = await createSubject(supervisor, subjectName);
        const dto: CreateTaskDto = {
            subjectId: subject.id,
            title: randomName(),
            contentFileLink: 'https://www.youtube.com/watch?v=2rduCeh-04M',
        };

        const task = await service.createTask(dto);
        expect(task.title).toBe(dto.title);
        expect(task.subject.id).toBe(dto.subjectId);

        await repo.softDelete(task.id);
        await subjectRepo.softDelete(subject.id);
        await userRepo.softDelete(supervisor.id);
    });

    it('should not allow duplicate task titles under same subject', async () => {
        const supervisor = await createTestUser(ERolesUser.SUPERVISOR);
        const subjectName = randomName();
        const subject = await createSubject(supervisor, subjectName);
        const dto: CreateTaskDto = {
            subjectId: subject.id,
            title: 'Sample Task',
            contentFileLink: 'http://example.com/another.pdf',
        };

        const task = await service.createTask(dto);

        await expect(service.createTask(dto)).rejects.toThrow(UnprocessableEntityException);

        await repo.softDelete(task.id);
        await subjectRepo.softDelete(subject.id);
        await userRepo.softDelete(supervisor.id);
    });
});
