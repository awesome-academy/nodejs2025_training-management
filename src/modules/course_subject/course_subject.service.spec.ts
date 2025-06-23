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
import { ForbiddenException, forwardRef, NotFoundException } from '@nestjs/common';
import { UserSubjectRepository } from '@repositories/user_subject.repository';
import { CourseSubjectRepository } from '@repositories/course_subject.repository';
import { UserTaskRepository } from '@repositories/user_task.repository';
import { TaskRepository } from '@repositories/task.repository';
import { Task } from '@modules/tasks/entity/task.entity';
import { UserCourseModule } from '@modules/user_course/user_course.module';
import { CourseSubjectService } from './course_subject.service';
import { SubjectModule } from '@modules/subjects/subjects.module';
import { SupervisorCourseModule } from '@modules/supervisor_course/supervisor_course.module';
import { UserSubjectModule } from '@modules/user_subject/user_subject.module';
import { courseSubjectProviders } from './course_subject.provider';
import { ECourseSubjectStatus } from './enum/index.enum';
import { EUserSubjectStatus } from '@modules/user_subject/enum/index.enum';
import { v4 as uuidv4 } from 'uuid';
import { SupervisorCourseRepository } from '@repositories/supervisor_course.repository';
import { SupervisorCourse } from '@modules/supervisor_course/entity/supervisor_course.entity';
import { Course } from '@modules/courses/entity/course.entity';
import { CourseSubject } from './entity/course_subject.entity';
import { UserSubject } from '@modules/user_subject/entity/user_subject.entity';
import { UserCourse } from '@modules/user_course/entity/user_course.entity';

describe('UserSubjectService (Unit Test)', () => {
    let service: CourseSubjectService;
    let repo: CourseSubjectRepository;
    let userRepo: UserRepository;
    let courseRepo: CourseRepository;
    let subjectRepo: SubjectRepository;
    let courseSubjectRepo: CourseSubjectRepository;
    let userTaskRepo: UserTaskRepository;
    let taskRepo: TaskRepository;
    let userSubjectRepo: UserSubjectRepository;
    let supervisorCourseRepo: SupervisorCourseRepository;
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

    const createCourse = async (
        user: User,
    ): Promise<{
        course: Course;
        supervisorCourse: SupervisorCourse;
    }> => {
        const course = await courseRepo.create({
            name: 'Test Course',
            description: 'Test Course',
            startDate: '01/10/2025',
            endDate: '10/10/2025',
            creator: {
                id: user.id,
            },
        });

        const supervisorCourse = await supervisorCourseRepo.create({
            course: {
                id: course.id,
            },
            user: {
                id: user.id,
            },
        });

        return {
            course,
            supervisorCourse,
        };
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
        const { course, supervisorCourse } = await createCourse(supervisor);
        const trainee = await createTestUser(ERolesUser.TRAINEE);
        const courseSubject = await courseSubjectRepo.create({
            course: {
                id: course.id,
            },
            subject: {
                id: subject.id,
            },
        });

        const userSubject = await userSubjectRepo.create({
            user: {
                id: trainee.id,
            },
            courseSubject: {
                id: courseSubject.id,
            },
        });

        const userCourse = await userCourseRepo.create({
            user: {
                id: trainee.id,
            },
            course: {
                id: course.id,
            },
            courseProgress: 0,
            enrollDate: new Date(),
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
            supervisorCourse,
            trainee,
            courseSubject,
            tasks,
            userSubject,
            userCourse,
        };
    };

    const clearData = async (
        supervisor: User,
        subject: Subject,
        course: Course,
        supervisorCourse: SupervisorCourse,
        userCourse: UserCourse,
        trainee: User,
        courseSubject: CourseSubject,
        tasks: Task[],
        userSubject: UserSubject,
    ) => {
        await repo.softDelete(userSubject.id);
        await courseSubjectRepo.softDelete(courseSubject.id);
        await Promise.all(tasks.map((task: Task) => taskRepo.softDelete(task.id)));
        await subjectRepo.softDelete(subject.id);
        await supervisorCourseRepo.softDelete(supervisorCourse.id);
        await courseRepo.softDelete(course.id);
        await userRepo.softDelete(supervisor.id);
        await userRepo.softDelete(trainee.id);
        await userCourseRepo.softDelete(userCourse.id);
    };

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                    envFilePath: path.resolve(process.cwd(), `.env.test`),
                }),
                DatabaseModule,
                forwardRef(() => SubjectModule),
                UserSubjectModule,
                UserCourseModule,
                SupervisorCourseModule,
            ],
            providers: [
                ...courseSubjectProviders,
                CourseSubjectService,
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
                {
                    provide: 'USER_SUBJECT_REPOSITORY',
                    useFactory: (dataSource: DataSource) => new UserSubjectRepository(dataSource),
                    inject: ['DATA_SOURCE'],
                },
                {
                    provide: 'SUPERVISOR_COURSE_REPOSITORY',
                    useFactory: (dataSource: DataSource) => new SupervisorCourseRepository(dataSource),
                    inject: ['DATA_SOURCE'],
                },
                {
                    provide: 'USER_COURSE_REPOSITORY',
                    useFactory: (dataSource: DataSource) => new UserCourseRepository(dataSource),
                    inject: ['DATA_SOURCE'],
                },
            ],
        }).compile();

        service = module.get<CourseSubjectService>(CourseSubjectService);
        repo = module.get<CourseSubjectRepository>('COURSE_SUBJECT_REPOSITORY');
        userRepo = module.get<UserRepository>('USER_REPOSITORY');
        courseRepo = module.get<CourseRepository>('COURSE_REPOSITORY');
        subjectRepo = module.get<SubjectRepository>('SUBJECT_REPOSITORY');
        courseSubjectRepo = module.get<CourseSubjectRepository>('COURSE_SUBJECT_REPOSITORY');
        userTaskRepo = module.get<UserTaskRepository>('USER_TASK_REPOSITORY');
        taskRepo = module.get<TaskRepository>('TASK_REPOSITORY');
        userSubjectRepo = module.get<UserSubjectRepository>('USER_SUBJECT_REPOSITORY');
        supervisorCourseRepo = module.get<SupervisorCourseRepository>('SUPERVISOR_COURSE_REPOSITORY');
        userCourseRepo = module.get<UserCourseRepository>('USER_COURSE_REPOSITORY');
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('Finish Subject For Course', () => {
        it('should not successfully if using another supervisor of course', async () => {
            const {
                supervisor,
                userCourse,
                subject,
                course,
                supervisorCourse,
                trainee,
                courseSubject,
                tasks,
                userSubject,
            } = await createUserSubject();

            const anotherSupervisor = await createTestUser(ERolesUser.SUPERVISOR);

            await expect(service.finishSubjectForCourse(courseSubject.id, anotherSupervisor)).rejects.toThrow(
                ForbiddenException,
            );

            await clearData(
                supervisor,
                subject,
                course,
                supervisorCourse,
                userCourse,
                trainee,
                courseSubject,
                tasks,
                userSubject,
            );
            await userRepo.softDelete(anotherSupervisor.id);
        });

        it('should successfully if operate by supervisor of course', async () => {
            const {
                supervisor,
                userCourse,
                subject,
                course,
                supervisorCourse,
                trainee,
                courseSubject,
                tasks,
                userSubject,
            } = await createUserSubject();

            const userTasks = await Promise.all(
                tasks.map((task) =>
                    userTaskRepo.create({
                        task: {
                            id: task.id,
                        },
                        userSubject: {
                            id: userSubject.id,
                        },
                    }),
                ),
            );

            await service.finishSubjectForCourse(courseSubject.id, supervisor);

            const courseSubjectUpdated = await repo.findOneById(courseSubject.id);

            expect(courseSubjectUpdated.status).toEqual(ECourseSubjectStatus.FINISH);

            const userSubjectUpdated = await userSubjectRepo.findOneById(userSubject.id);

            expect(userSubjectUpdated.status).toEqual(EUserSubjectStatus.FINISH);

            const userTasksUpdated = (await userTaskRepo.findAll({ userSubject: { id: userSubject.id } })).items;

            userTasksUpdated.map((userTaskUpdated) =>
                expect(userTaskUpdated.status).toEqual(EUserSubjectStatus.FINISH),
            );

            await Promise.all(userTasks.map((userTask) => userTaskRepo.softDelete(userTask.id)));

            await clearData(
                supervisor,
                subject,
                course,
                supervisorCourse,
                userCourse,
                trainee,
                courseSubject,
                tasks,
                userSubject,
            );
        });
    });

    describe('Add Subject for Course', () => {
        it('should add subject for course successfully', async () => {
            const {
                supervisor,
                userCourse,
                subject,
                course,
                supervisorCourse,
                trainee,
                courseSubject,
                tasks,
                userSubject,
            } = await createUserSubject();

            const firstAddedSubject = await createSubject(supervisor, randomName());
            const secondAddedSubject = await createSubject(supervisor, randomName());

            const courseSubjects = await service.addSubjectCourse(course.id, [
                firstAddedSubject.id,
                secondAddedSubject.id,
            ]);

            expect(courseSubjects.length).toEqual(2);

            expect(courseSubjects[0].subject.id).toEqual(firstAddedSubject.id);

            expect(courseSubjects[1].subject.id).toEqual(secondAddedSubject.id);

            await clearData(
                supervisor,
                subject,
                course,
                supervisorCourse,
                userCourse,
                trainee,
                courseSubject,
                tasks,
                userSubject,
            );
            await subjectRepo.softDelete(firstAddedSubject.id);
            await subjectRepo.softDelete(secondAddedSubject.id);
        });

        it('should not add subject for course successfully if subject not found', async () => {
            const {
                supervisor,
                userCourse,
                subject,
                course,
                supervisorCourse,
                trainee,
                courseSubject,
                tasks,
                userSubject,
            } = await createUserSubject();

            const invalidId = uuidv4();

            await expect(service.addSubjectCourse(course.id, [invalidId])).rejects.toThrow(NotFoundException);

            await clearData(
                supervisor,
                subject,
                course,
                supervisorCourse,
                userCourse,
                trainee,
                courseSubject,
                tasks,
                userSubject,
            );
        });
    });

    describe('Delete Course Subject', () => {
        it('should delete the subjects of course successfully', async () => {
            const {
                supervisor,
                userCourse,
                subject,
                course,
                supervisorCourse,
                trainee,
                courseSubject,
                tasks,
                userSubject,
            } = await createUserSubject();

            const result = await service.deleteByCourseId(course.id);

            expect(result.affected).toEqual(1);

            await clearData(
                supervisor,
                subject,
                course,
                supervisorCourse,
                userCourse,
                trainee,
                courseSubject,
                tasks,
                userSubject,
            );
        });

        it('should delete the subjects of course successfully by course and subject id', async () => {
            const {
                supervisor,
                userCourse,
                subject,
                course,
                supervisorCourse,
                trainee,
                courseSubject,
                tasks,
                userSubject,
            } = await createUserSubject();

            const result = await service.deleteByCourseAndSubjectId(course.id, subject.id);

            expect(result.affected).toEqual(1);

            await clearData(
                supervisor,
                subject,
                course,
                supervisorCourse,
                userCourse,
                trainee,
                courseSubject,
                tasks,
                userSubject,
            );
        });
    });
});
