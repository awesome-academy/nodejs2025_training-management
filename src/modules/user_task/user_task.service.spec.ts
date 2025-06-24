import { Test, TestingModule } from '@nestjs/testing';
import { ERolesUser, EStatusUser } from '@modules/users/enums/index.enum';
import { User } from '@modules/users/entity/user.entity';
import { DatabaseModule } from '@modules/databases/databases.module';
import { ConfigModule } from '@nestjs/config';
import * as path from 'path';
import { SubjectRepository } from '@repositories/subject.repository';
import { DataSource } from 'typeorm';
import { CourseRepository } from '@repositories/course.repository';
import { UserCourseRepository } from '@repositories/user_course.repository';
import { UserRepository } from '@repositories/user.repository';
import { Subject } from '@modules/subjects/entity/subject.entity';
import { ForbiddenException, forwardRef } from '@nestjs/common';
import { UserSubjectRepository } from '@repositories/user_subject.repository';
import { CourseSubjectRepository } from '@repositories/course_subject.repository';
import { UserTaskRepository } from '@repositories/user_task.repository';
import { TaskRepository } from '@repositories/task.repository';
import { Task } from '@modules/tasks/entity/task.entity';
import { EUserCourseStatus } from '@modules/user_course/enum/index.enum';
import { UserTaskService } from './user_task.service';
import { UserSubjectModule } from '@modules/user_subject/user_subject.module';
import { userTaskProviders } from './user_task.provider';
import { EUserSubjectStatus } from '@modules/user_subject/enum/index.enum';

describe('UserTaskService (Unit Test)', () => {
    let service: UserTaskService;
    let repo: UserTaskRepository;
    let userRepo: UserRepository;
    let courseRepo: CourseRepository;
    let subjectRepo: SubjectRepository;
    let courseSubjectRepo: CourseSubjectRepository;
    let userSubjectRepo: UserSubjectRepository;
    let taskRepo: TaskRepository;
    let userCourseRepo: UserCourseRepository;

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

    const creatTask = async (subject: Subject): Promise<Task> => {
        return await taskRepo.create({
            title: randomName(),
            contentFileLink: 'default link',
            subject: {
                id: subject.id,
            },
        });
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

    const createUserSubject = async (numberOfTask = 1) => {
        const supervisor = await createTestUser(ERolesUser.SUPERVISOR);
        const subject = await createSubject(supervisor);
        const course = await createCourse(subject, supervisor);
        const trainee = await createTestUser(ERolesUser.TRAINEE);
        const courseSubject = await courseSubjectRepo.create({
            course: {
                id: course.id,
            },
            subject: {
                id: subject.id,
            },
        });
        const tasks: Task[] = [];

        for (let i = 0; i < numberOfTask; i++) {
            const task = await creatTask(subject);
            tasks.push(task);
        }

        const userSubject = await userSubjectRepo.create({
            user: {
                id: trainee.id,
            },
            courseSubject: {
                id: courseSubject.id,
            },
        });

        return {
            supervisor,
            subject,
            course,
            trainee,
            courseSubject,
            tasks,
            userSubject,
        };
    };

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                    envFilePath: path.resolve(process.cwd(), `.env.test`),
                }),
                DatabaseModule,
                forwardRef(() => UserSubjectModule),
            ],
            providers: [
                ...userTaskProviders,
                UserTaskService,
                {
                    provide: 'COURSE_REPOSITORY',
                    useFactory: (dataSource: DataSource) => {
                        return new CourseRepository(dataSource);
                    },
                    inject: ['DATA_SOURCE'],
                },
                {
                    provide: 'SUBJECT_REPOSITORY',
                    useFactory: (dataSource: DataSource) => {
                        return new SubjectRepository(dataSource);
                    },
                    inject: ['DATA_SOURCE'],
                },
                {
                    provide: 'USER_REPOSITORY',
                    useFactory: (dataSource: DataSource) => {
                        return new UserRepository(dataSource);
                    },
                    inject: ['DATA_SOURCE'],
                },
                {
                    provide: 'USER_COURSE_REPOSITORY',
                    useFactory: (dataSource: DataSource) => {
                        return new UserCourseRepository(dataSource);
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
                    useFactory: (dataSource: DataSource) => new UserSubjectRepository(dataSource),
                    inject: ['DATA_SOURCE'],
                },
                {
                    provide: 'TASK_REPOSITORY',
                    useFactory: (dataSource: DataSource) => new TaskRepository(dataSource),
                    inject: ['DATA_SOURCE'],
                },
                {
                    provide: 'USER_COURSE_REPOSITORY',
                    useFactory: (dataSource: DataSource) => new UserCourseRepository(dataSource),
                    inject: ['DATA_SOURCE'],
                },
            ],
        }).compile();

        service = module.get<UserTaskService>(UserTaskService);
        repo = module.get<UserTaskRepository>('USER_TASK_REPOSITORY');
        userRepo = module.get<UserRepository>('USER_REPOSITORY');
        courseRepo = module.get<CourseRepository>('COURSE_REPOSITORY');
        subjectRepo = module.get<SubjectRepository>('SUBJECT_REPOSITORY');
        courseSubjectRepo = module.get<CourseSubjectRepository>('COURSE_SUBJECT_REPOSITORY');
        userSubjectRepo = module.get<UserSubjectRepository>('USER_SUBJECT_REPOSITORY');
        taskRepo = module.get<TaskRepository>('TASK_REPOSITORY');
        userCourseRepo = module.get<UserCourseRepository>('USER_COURSE_REPOSITORY');
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('Add Trainee For UserTask', () => {
        it('should create successfully', async () => {
            const { supervisor, subject, course, trainee, courseSubject, tasks, userSubject } =
                await createUserSubject(1);
            const userTasks = await service.handleCreateUserTask(userSubject, tasks);
            expect(userTasks[0].task.id).toEqual(tasks[0].id);
            expect(userTasks[0].userSubject.id).toEqual(userSubject.id);

            await Promise.all(userTasks.map((userTask) => repo.softDelete(userTask.id)));
            await Promise.all(tasks.map((task) => taskRepo.softDelete(task.id)));
            await repo.softDelete(userSubject.id);
            await courseSubjectRepo.softDelete(courseSubject.id);
            await subjectRepo.softDelete(subject.id);
            await courseRepo.softDelete(course.id);
            await userRepo.softDelete(supervisor.id);
            await userRepo.softDelete(trainee.id);
        });

        it('should create userTasks successfully when there are 2 tasks', async () => {
            const { supervisor, subject, course, trainee, courseSubject, tasks, userSubject } =
                await createUserSubject(2);

            expect(tasks.length).toBe(2);

            const userTasks = await service.handleCreateUserTask(userSubject, tasks);

            expect(userTasks.length).toBe(2);

            for (let i = 0; i < tasks.length; i++) {
                expect(userTasks[i].task.id).toEqual(tasks[i].id);
                expect(userTasks[i].userSubject.id).toEqual(userSubject.id);
            }

            await Promise.all(userTasks.map((userTask) => repo.softDelete(userTask.id)));
            await Promise.all(tasks.map((task) => taskRepo.softDelete(task.id)));
            await repo.softDelete(userSubject.id);
            await courseSubjectRepo.softDelete(courseSubject.id);
            await subjectRepo.softDelete(subject.id);
            await courseRepo.softDelete(course.id);
            await userRepo.softDelete(supervisor.id);
            await userRepo.softDelete(trainee.id);
        });
    });

    describe('Finish Subject', () => {
        it('should update user subject status', async () => {
            const { supervisor, subject, course, trainee, courseSubject, tasks, userSubject } =
                await createUserSubject(2);

            expect(tasks.length).toBe(2);

            const userTasks = await service.handleCreateUserTask(userSubject, tasks);

            let userCourse = await userCourseRepo.create({
                course: {
                    id: course.id,
                },
                user: {
                    id: trainee.id,
                },
                courseProgress: 0,
                enrollDate: new Date(),
            });

            expect(userTasks.length).toBe(2);

            for (let i = 0; i < tasks.length; i++) {
                expect(userTasks[i].task.id).toEqual(tasks[i].id);
                expect(userTasks[i].userSubject.id).toEqual(userSubject.id);
            }

            const { isSubjectFinish } = (await service.updateStatusForUser(userTasks[0].id, trainee)).data;

            expect(isSubjectFinish).toEqual(false);

            const checkSubjectFinish = (await service.updateStatusForUser(userTasks[1].id, trainee)).data
                .isSubjectFinish;

            expect(checkSubjectFinish).toEqual(true);

            const userSubjectUpdated = await userSubjectRepo.findOneById(userSubject.id);

            expect(userSubjectUpdated.status).toEqual(EUserSubjectStatus.FINISH);

            userCourse = await userCourseRepo.findOneById(userCourse.id);

            expect(userCourse.status).toEqual(EUserCourseStatus.PASS);

            expect(userCourse.courseProgress).toEqual(100);

            await Promise.all(userTasks.map((userTask) => repo.softDelete(userTask.id)));
            await Promise.all(tasks.map((task) => taskRepo.softDelete(task.id)));
            await repo.softDelete(userSubject.id);
            await userCourseRepo.softDelete(userCourse.id);
            await courseSubjectRepo.softDelete(courseSubject.id);
            await subjectRepo.softDelete(subject.id);
            await courseRepo.softDelete(course.id);
            await userRepo.softDelete(supervisor.id);
            await userRepo.softDelete(trainee.id);
        });
        it('should not update user subject status if trainee is not belong to this subject course', async () => {
            const { supervisor, subject, course, trainee, courseSubject, tasks, userSubject } =
                await createUserSubject(2);
            const userTasks = await service.handleCreateUserTask(userSubject, tasks);

            const anotherTrainee = await createTestUser(ERolesUser.TRAINEE);

            await expect(service.updateStatusForUser(userTasks[0].id, anotherTrainee)).rejects.toThrow(
                ForbiddenException,
            );

            await Promise.all(userTasks.map((userTask) => repo.softDelete(userTask.id)));
            await Promise.all(tasks.map((task) => taskRepo.softDelete(task.id)));
            await repo.softDelete(userSubject.id);
            await courseSubjectRepo.softDelete(courseSubject.id);
            await subjectRepo.softDelete(subject.id);
            await courseRepo.softDelete(course.id);
            await userRepo.softDelete(supervisor.id);
            await userRepo.softDelete(trainee.id);
        });
    });
});
