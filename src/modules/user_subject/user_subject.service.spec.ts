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
import { userSubjectProviders } from './user_subject.provider';
import { UserSubjectService } from './user_subject.service';
import { UserSubjectRepository } from '@repositories/user_subject.repository';
import { CourseSubjectRepository } from '@repositories/course_subject.repository';
import { UserTaskRepository } from '@repositories/user_task.repository';
import { TaskRepository } from '@repositories/task.repository';
import { Task } from '@modules/tasks/entity/task.entity';
import { UserTask } from '@modules/user_task/entity/user_task.entity';
import { EUserSubjectStatus } from './enum/index.enum';
import { EUserTaskStatus } from '@modules/user_task/enum/index.enum';
import { EUserCourseStatus } from '@modules/user_course/enum/index.enum';
import { UserCourseModule } from '@modules/user_course/user_course.module';
import { UserTaskModule } from '@modules/user_task/user_task.module';

describe('UserSubjectService (Unit Test)', () => {
    let service: UserSubjectService;
    let repo: UserSubjectRepository;
    let userRepo: UserRepository;
    let courseRepo: CourseRepository;
    let subjectRepo: SubjectRepository;
    let courseSubjectRepo: CourseSubjectRepository;
    let userTaskRepo: UserTaskRepository;
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

        return {
            supervisor,
            subject,
            course,
            trainee,
            courseSubject,
            tasks,
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
                forwardRef(() => UserTaskModule),
                forwardRef(() => UserCourseModule),
            ],
            providers: [
                ...userSubjectProviders,
                UserSubjectService,
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
                    provide: 'USER_TASK_REPOSITORY',
                    useFactory: (dataSource: DataSource) => new UserTaskRepository(dataSource),
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

        service = module.get(UserSubjectService);
        repo = module.get<UserSubjectRepository>('USER_SUBJECT_REPOSITORY');
        userRepo = module.get<UserRepository>('USER_REPOSITORY');
        courseRepo = module.get<CourseRepository>('COURSE_REPOSITORY');
        subjectRepo = module.get<SubjectRepository>('SUBJECT_REPOSITORY');
        courseSubjectRepo = module.get<CourseSubjectRepository>('COURSE_SUBJECT_REPOSITORY');
        userTaskRepo = module.get<UserTaskRepository>('USER_TASK_REPOSITORY');
        taskRepo = module.get<TaskRepository>('TASK_REPOSITORY');
        userCourseRepo = module.get<UserCourseRepository>('USER_COURSE_REPOSITORY');
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('Add Trainee For CourseSubject', () => {
        it('should create successfully', async () => {
            const { supervisor, subject, course, trainee, courseSubject } = await createUserSubject();

            const userSubject = await service.addTraineeForUserSubject(courseSubject.id, trainee);

            expect(userSubject.courseSubject.id).toEqual(courseSubject.id);
            expect(userSubject.user.id).toEqual(trainee.id);

            await repo.softDelete(userSubject.id);
            await subjectRepo.softDelete(subject.id);
            await courseRepo.softDelete(course.id);
            await userRepo.softDelete(supervisor.id);
            await userRepo.softDelete(trainee.id);
        });
    });

    describe('Finish Subject', () => {
        it('should update user subject status', async () => {
            const { supervisor, subject, course, trainee, courseSubject, tasks } = await createUserSubject();
            const userCourse = await userCourseRepo.create({
                course: {
                    id: course.id,
                },
                user: {
                    id: trainee.id,
                },
                courseProgress: 0,
                enrollDate: new Date(),
            });
            let userSubject = await service.addTraineeForUserSubject(courseSubject.id, trainee);
            let userTasks: UserTask[] = await Promise.all(
                tasks.map((task) =>
                    userTaskRepo.create({
                        userSubject: {
                            id: userSubject.id,
                        },
                        task: {
                            id: task.id,
                        },
                    }),
                ),
            );

            await service.finishSubjectForTrainee(userSubject.id, trainee);

            userSubject = await repo.findOneById(userSubject.id);

            expect(userSubject.status).toEqual(EUserSubjectStatus.FINISH);

            userTasks = (
                await userTaskRepo.findAll({
                    userSubject: {
                        id: userSubject.id,
                    },
                })
            ).items;

            userTasks.map((userTask) => expect(userTask.status).toEqual(EUserTaskStatus.FINISH));

            const updatedUserCourse = await userCourseRepo.findOneById(userCourse.id);

            expect(updatedUserCourse.status).toEqual(EUserCourseStatus.PASS);

            expect(updatedUserCourse.courseProgress).toEqual(100);

            await Promise.all(userTasks.map((userTask) => userTaskRepo.softDelete(userTask.id)));
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
            const { supervisor, subject, course, trainee, courseSubject, tasks } = await createUserSubject();
            const userCourse = await userCourseRepo.create({
                course: {
                    id: course.id,
                },
                user: {
                    id: trainee.id,
                },
                courseProgress: 0,
                enrollDate: new Date(),
            });
            let userSubject = await service.addTraineeForUserSubject(courseSubject.id, trainee);
            const userTasks: UserTask[] = await Promise.all(
                tasks.map((task) =>
                    userTaskRepo.create({
                        userSubject: {
                            id: userSubject.id,
                        },
                        task: {
                            id: task.id,
                        },
                    }),
                ),
            );

            const anotherTrainee = await createTestUser(ERolesUser.TRAINEE);

            await service.finishSubjectForTrainee(userSubject.id, trainee);

            userSubject = await repo.findOneById(userSubject.id);

            await expect(service.finishSubjectForTrainee(userSubject.id, anotherTrainee)).rejects.toThrow(
                ForbiddenException,
            );

            await Promise.all(userTasks.map((userTask) => userTaskRepo.softDelete(userTask.id)));
            await Promise.all(tasks.map((task) => taskRepo.softDelete(task.id)));
            await repo.softDelete(userSubject.id);
            await userCourseRepo.softDelete(userCourse.id);
            await courseSubjectRepo.softDelete(courseSubject.id);
            await subjectRepo.softDelete(subject.id);
            await courseRepo.softDelete(course.id);
            await userRepo.softDelete(supervisor.id);
            await userRepo.softDelete(trainee.id);
        });
    });
});
