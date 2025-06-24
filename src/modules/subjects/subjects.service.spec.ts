import { Test, TestingModule } from '@nestjs/testing';
import { SubjectService } from './subjects.service';
import { forwardRef, UnprocessableEntityException } from '@nestjs/common';
import { ERolesUser, EStatusUser } from '@modules/users/enums/index.enum';
import { User } from '@modules/users/entity/user.entity';
import { UserModule } from '@modules/users/user.module';
import { TaskModule } from '@modules/tasks/task.module';
import { DatabaseModule } from '@modules/databases/databases.module';
import { subjectProviders } from './subjects.provider';
import { SharedModule } from '@modules/shared/shared.module';
import { ConfigModule } from '@nestjs/config';
import * as path from 'path';
import { CourseSubjectModule } from '@modules/course_subject/course_subject.module';
import { SubjectRepository } from '@repositories/subject.repository';
import { UsersService } from '@modules/users/user.services';
import { Subject } from './entity/subject.entity';
import { Course } from '@modules/courses/entity/course.entity';
import { UserSubjectRepository } from '@repositories/user_subject.repository';
import { CourseSubjectRepository } from '@repositories/course_subject.repository';
import { DataSource } from 'typeorm';
import { CourseRepository } from '@repositories/course.repository';

describe('SubjectService (Unit Test)', () => {
    let service: SubjectService;
    let repo: SubjectRepository;
    let userService: UsersService;
    let courseRepo: CourseRepository;
    let userSubjectRepo: UserSubjectRepository;
    let courseSubjectRepo: CourseSubjectRepository;

    const mockSubject = {
        name: 'Math',
        description: 'Math subject',
    };

    const mockTasks = [
        {
            contentFileLink: 'https://www.youtube.com/watch?v=2rduCeh-04M',
            title: 'Test Devops',
        },
        {
            contentFileLink: 'https://www.youtube.com/watch?v=2rduCeh-04M',
            title: 'Test CI CD',
        },
    ];

    const getInfoTestUserByRole = (role: ERolesUser): { name: string; email: string } => {
        switch (role) {
            case ERolesUser.SUPERVISOR:
                return { name: 'Supervisor Test', email: 'testsupervisor@gmail.com' };
            case ERolesUser.TRAINEE:
                return { name: 'Trainee Test', email: 'testtrainee@gmail.com' };
        }
    };

    const createTestUser = async (role: ERolesUser): Promise<User> => {
        return await userService.create({
            status: EStatusUser.ACTIVE,
            role,
            password: '123456',
            ...getInfoTestUserByRole(role),
        });
    };

    const createSubject = async (user: User, name?: string): Promise<Subject> => {
        const dto = {
            description: mockSubject.description,
            name: name ?? randomName(),
            tasks: mockTasks,
        };
        return (await service.createSubject(dto, user)).data;
    };

    const createCourse = async (subject: Subject, user: User): Promise<any> => {
        return await courseRepo.create({
            name: 'Test Course',
            description: 'Test Course',
            startDate: '01/10/2025',
            endDate: '10/10/2025',
            creator: {
                id: user.id,
            },
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

    const simulateLearning = async (course: Course, subject: Subject, trainee: User) => {
        const courseSubject = await courseSubjectRepo.create({
            course: { id: course.id },
            subject: { id: subject.id },
        });

        const userSubject = await userSubjectRepo.create({
            user: { id: trainee.id },
            courseSubject: { id: courseSubject.id },
        });

        return {
            courseSubject,
            userSubject,
        };
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                    envFilePath: path.resolve(process.cwd(), `.env.test`),
                }),
                DatabaseModule,
                SharedModule,
                UserModule,
                TaskModule,
                forwardRef(() => CourseSubjectModule),
            ],
            providers: [
                SubjectService,
                ...subjectProviders,
                {
                    provide: 'COURSE_REPOSITORY',
                    useFactory: (dataSource: DataSource) => {
                        return new CourseRepository(dataSource);
                    },
                    inject: ['DATA_SOURCE'],
                },
                {
                    provide: 'COURSE_SUBJECT_REPOSITORY',
                    useFactory: (dataSource: DataSource) => {
                        return new CourseSubjectRepository(dataSource);
                    },
                    inject: ['DATA_SOURCE'],
                },
                {
                    provide: 'USER_SUBJECT_REPOSITORY',
                    useFactory: (dataSource: DataSource) => {
                        return new UserSubjectRepository(dataSource);
                    },
                    inject: ['DATA_SOURCE'],
                },
            ],
        }).compile();

        service = module.get(SubjectService);
        repo = module.get<SubjectRepository>('SUBJECT_REPOSITORY');
        userService = module.get(UsersService);
        courseRepo = module.get<CourseRepository>('COURSE_REPOSITORY');
        userSubjectRepo = module.get<UserSubjectRepository>('USER_SUBJECT_REPOSITORY');
        courseSubjectRepo = module.get<CourseSubjectRepository>('COURSE_SUBJECT_REPOSITORY');
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createSubject', () => {
        it('should create a subject successfully', async () => {
            const supervisor = await createTestUser(ERolesUser.SUPERVISOR);
            const subject = await createSubject(supervisor, 'Math Test');

            expect(subject.name).toEqual('Math Test');
            expect(subject.description).toEqual(mockSubject.description);
            expect(subject.creator.id).toEqual(supervisor.id);

            await repo.softDelete(subject.id);
            await userService.remove(supervisor.id);
        });

        it('should throw if creating subject with same name again', async () => {
            const supervisor = await createTestUser(ERolesUser.SUPERVISOR);
            const subject = await createSubject(supervisor, 'Duplicate');
            await expect(createSubject(supervisor, 'Duplicate')).rejects.toThrow(UnprocessableEntityException);
            await repo.softDelete(subject.id);
            await userService.remove(supervisor.id);
        });
    });

    describe('updateSubject', () => {
        it('should update subject info and tasks', async () => {
            const supervisor = await createTestUser(ERolesUser.SUPERVISOR);
            const subject = await createSubject(supervisor);
            const updateDto = { name: randomName(), description: 'Updated Description' };
            const taskDto = {
                tasks: [
                    {
                        contentFileLink: 'https://www.youtube.com/watch?v=2rduCeh-04M',
                        title: randomName(),
                    },
                ],
            };

            await service.updateSubjectInfo(subject.id, updateDto);
            const updatedSubject = await service.findOne(subject.id);
            expect(updatedSubject.name).toBe(updateDto.name);
            expect(updatedSubject.description).toBe(updateDto.description);

            const updatedTasks = (await service.addTaskForSubject(subject.id, taskDto)).data;
            expect(updatedTasks).toHaveLength(taskDto.tasks.length);
            expect(updatedTasks[0].subject.id).toBe(subject.id);

            await repo.softDelete(subject.id);
            await userService.remove(supervisor.id);
        });

        it('should throw when updating subject if trainee has learnt', async () => {
            const supervisor = await createTestUser(ERolesUser.SUPERVISOR);
            const trainee = await createTestUser(ERolesUser.TRAINEE);
            const subject = await createSubject(supervisor);
            const course = await createCourse(subject, supervisor);

            const { courseSubject, userSubject } = await simulateLearning(course, subject, trainee);

            await expect(service.updateSubjectInfo(subject.id, { name: 'New', description: 'New' })).rejects.toThrow(
                UnprocessableEntityException,
            );

            await expect(service.addTaskForSubject(subject.id, { tasks: [mockTasks[0]] })).rejects.toThrow(
                UnprocessableEntityException,
            );

            await courseSubjectRepo.softDelete(courseSubject.id);
            await userSubjectRepo.softDelete(userSubject.id);
            await repo.softDelete(subject.id);
            await userService.remove(supervisor.id);
            await userService.remove(trainee.id);
            await courseRepo.softDelete(course.id);
        });
    });

    describe('deleteSubject', () => {
        it('should delete subject if no trainee has learnt', async () => {
            const supervisor = await createTestUser(ERolesUser.SUPERVISOR);
            const subject = await createSubject(supervisor);

            const result = (await service.deleteSubject(subject.id, supervisor)).data;
            expect(result.affected).toBe(1);

            await repo.softDelete(subject.id);
            await userService.remove(supervisor.id);
        });

        it('should throw if trainee has learnt the subject', async () => {
            const supervisor = await createTestUser(ERolesUser.SUPERVISOR);
            const trainee = await createTestUser(ERolesUser.TRAINEE);
            const subject = await createSubject(supervisor);
            const course = await createCourse(subject, supervisor);

            const { courseSubject, userSubject } = await simulateLearning(course, subject, trainee);
            await expect(service.deleteSubject(subject.id, supervisor)).rejects.toThrow(UnprocessableEntityException);

            await courseSubjectRepo.softDelete(courseSubject.id);
            await userSubjectRepo.softDelete(userSubject.id);
            await repo.softDelete(subject.id);
            await userService.remove(supervisor.id);
            await userService.remove(trainee.id);
            await courseRepo.softDelete(course.id);
        });
    });
});
