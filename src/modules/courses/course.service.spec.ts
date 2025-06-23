import { Test, TestingModule } from '@nestjs/testing';
import { ERolesUser, EStatusUser } from '@modules/users/enums/index.enum';
import { User } from '@modules/users/entity/user.entity';
import { DatabaseModule } from '@modules/databases/databases.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as path from 'path';
import { SubjectRepository } from '@repositories/subject.repository';
import { DataSource, UpdateResult } from 'typeorm';
import { CourseRepository } from '@repositories/course.repository';
import { UserCourseRepository } from '@repositories/user_course.repository';
import { UserRepository } from '@repositories/user.repository';
import { Subject } from '@modules/subjects/entity/subject.entity';
import { UserSubjectRepository } from '@repositories/user_subject.repository';
import { CourseSubjectRepository } from '@repositories/course_subject.repository';
import { UserTaskRepository } from '@repositories/user_task.repository';
import { TaskRepository } from '@repositories/task.repository';
import { Task } from '@modules/tasks/entity/task.entity';
import { UserCourseModule } from '@modules/user_course/user_course.module';
import { SupervisorCourseModule } from '@modules/supervisor_course/supervisor_course.module';
import { UserSubjectModule } from '@modules/user_subject/user_subject.module';
import { SupervisorCourseRepository } from '@repositories/supervisor_course.repository';
import { SupervisorCourse } from '@modules/supervisor_course/entity/supervisor_course.entity';
import { Course } from '@modules/courses/entity/course.entity';
import { UserCourse } from '@modules/user_course/entity/user_course.entity';
import { CourseService } from './course.service';
import { CourseSubjectModule } from '@modules/course_subject/course_subject.module';
import { UserModule } from '@modules/users/user.module';
import { UserTaskModule } from '@modules/user_task/user_task.module';
import { QueueModule } from '@modules/queue/queue.module';
import { courseProviders } from './cousre.provider';
import { ForbiddenException, forwardRef, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { v4 as uuidv4 } from 'uuid';
import { FindMemberOfCourseDto } from './dto/findMember.dto';
import { EUserCourseStatus } from '@modules/user_course/enum/index.enum';
import { UserCourseResponse } from '@modules/user_course/dto/UserCourseResponse.dto';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';
import { UpdateStatusTraineeDto } from './dto/trainee.dto';
import { FindCourseDto } from './dto/findCourse.dto';
import { ECourseStatus } from './enum/index.enum';
import { EUserTaskStatus } from '@modules/user_task/enum/index.enum';
import { UpdateCourseDto } from './dto/updateCourse.dto';
import { DeleteTraineeDto } from './dto/deleteTrainee.dto';

describe('CourseService (Unit Test)', () => {
    let service: CourseService;
    let repo: CourseRepository;
    let userRepo: UserRepository;
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
                return { name: 'Supervisor Test', email: `${randomName(6)}supervisor@gmail.com` };
            case ERolesUser.TRAINEE:
                return { name: 'Trainee Test', email: `${randomName(6)}@gmail.com` };
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
        const course = await repo.create({
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

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                    envFilePath: path.resolve(process.cwd(), `.env.test`),
                }),
                MailerModule.forRootAsync({
                    imports: [ConfigModule],
                    useFactory: (configService: ConfigService) => ({
                        transport: {
                            host: configService.get<string>('MAIL_HOST'),
                            service: 'gmail',
                            secure: false,
                            auth: {
                                user: configService.get<string>('MAIL_USER'),
                                pass: configService.get<string>('MAIL_PASSWORD'),
                            },
                            logger: true,
                        },
                    }),
                    inject: [ConfigService],
                }),
                DatabaseModule,
                forwardRef(() => SupervisorCourseModule),
                CourseSubjectModule,
                UserModule,
                UserCourseModule,
                UserSubjectModule,
                UserTaskModule,
                QueueModule,
            ],
            providers: [
                ...courseProviders,
                CourseService,
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

        service = module.get<CourseService>(CourseService);
        repo = module.get<CourseRepository>('COURSE_REPOSITORY');
        userRepo = module.get<UserRepository>('USER_REPOSITORY');
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

    describe('Create New Course', () => {
        it('should create new course successfully', async () => {
            const supervisor = await createTestUser(ERolesUser.SUPERVISOR);
            const subject = await createSubject(supervisor);
            const dto = {
                name: randomName(),
                description: 'test',
                startDate: '01/01/2025',
                endDate: '10/01/2025',
                subjectIds: [subject.id],
            };

            const res = await service.createNewCourse(dto as any, supervisor);
            expect(res).toBeDefined();
            expect(res.data.name).toEqual(dto.name);
        });

        it('should throw if course name already exists', async () => {
            const supervisor = await createTestUser(ERolesUser.SUPERVISOR);
            const course = await createCourse(supervisor);

            const dto = {
                name: course.course.name,
                description: 'Duplicated course',
                startDate: '01/01/2025',
                endDate: '10/01/2025',
                subjectIds: ['any'],
            };

            await expect(service.createNewCourse(dto as any, supervisor)).rejects.toThrow('courses.Course is existed');
        });

        it('should throw if startDate is after endDate', async () => {
            const supervisor = await createTestUser(ERolesUser.SUPERVISOR);
            const subject = await createSubject(supervisor);

            const dto = {
                name: randomName(),
                description: 'test',
                startDate: '10/01/2025',
                endDate: '01/01/2025',
                subjectIds: [subject.id],
            };

            await expect(service.createNewCourse(dto as any, supervisor)).rejects.toThrow();
        });

        it('should throw if subjectIds is empty', async () => {
            const supervisor = await createTestUser(ERolesUser.SUPERVISOR);

            const dto = {
                name: randomName(),
                description: 'test',
                startDate: '01/01/2025',
                endDate: '10/01/2025',
                subjectIds: [],
            };

            await expect(service.createNewCourse(dto as any, supervisor)).rejects.toThrow(
                'courses.At least one subject is required',
            );
        });

        it('should rollback if exception happens inside transaction', async () => {
            const supervisor = await createTestUser(ERolesUser.SUPERVISOR);
            const subject = await createSubject(supervisor);

            const dto = {
                name: randomName(),
                description: 'test',
                startDate: '01/01/2025',
                endDate: '10/01/2025',
                subjectIds: [subject.id],
            };

            const originalAddSubject = service['addSubjectForCourse'];
            service['addSubjectForCourse'] = jest.fn().mockImplementation(() => {
                throw new Error('Fake error during addSubject');
            });

            await expect(service.createNewCourse(dto as any, supervisor)).rejects.toThrow(
                'courses.Error happens when creating new course',
            );

            service['addSubjectForCourse'] = originalAddSubject;
        });
    });

    describe('Add Trainees to Course', () => {
        let supervisor: User;
        let trainee: User;
        let course: Course;

        beforeEach(async () => {
            supervisor = await createTestUser(ERolesUser.SUPERVISOR);
            trainee = await createTestUser(ERolesUser.TRAINEE);
            const res = await createCourse(supervisor);
            course = res.course;
        });

        it('should add trainee successfully', async () => {
            const subject = await createSubject(supervisor);
            await courseSubjectRepo.create({
                course: { id: course.id },
                subject: { id: subject.id },
            });

            const dto = {
                courseId: course.id,
                emails: [trainee.email],
            };

            const result = await service.addTraineesToCourse(dto, supervisor);
            expect(result).toBeDefined();
            expect(Array.isArray(result.data)).toEqual(true);
            expect(result.data.length).toEqual(1);
            expect(result.data[0].user.id).toEqual(trainee.id);
        });

        it("should throw NotFoundException if trainee's email not found", async () => {
            const dto = {
                courseId: course.id,
                emails: ['notfound@example.com'],
            };

            await expect(service.addTraineesToCourse(dto, supervisor)).rejects.toThrow(UnprocessableEntityException);
        });

        it('should throw UnprocessableEntityException if trainee already joined course', async () => {
            await userCourseRepo.create({
                user: { id: trainee.id },
                course: { id: course.id },
                enrollDate: new Date(),
                courseProgress: 0,
            });

            const dto = {
                courseId: course.id,
                emails: [trainee.email],
            };

            await expect(service.addTraineesToCourse(dto, supervisor)).rejects.toThrow(UnprocessableEntityException);
        });

        it('should throw NotFoundException if course not found', async () => {
            const dto = {
                courseId: uuidv4(),
                emails: [trainee.email],
            };

            await expect(service.addTraineesToCourse(dto, supervisor)).rejects.toThrow(ForbiddenException);
        });

        it('should throw UnprocessableEntityException if any email fails', async () => {
            const subject = await createSubject(supervisor);
            await courseSubjectRepo.create({
                course: { id: course.id },
                subject: { id: subject.id },
            });

            const dto = {
                courseId: course.id,
                emails: [trainee.email, 'notfound@example.com'],
            };

            await expect(service.addTraineesToCourse(dto, supervisor)).rejects.toThrow(UnprocessableEntityException);
        });
    });

    describe('Get All Trainee Course For Course', () => {
        let supervisor: User;
        let trainee: User;
        let course: Course;

        beforeEach(async () => {
            supervisor = await createTestUser(ERolesUser.SUPERVISOR);
            trainee = await createTestUser(ERolesUser.TRAINEE);
            const res = await createCourse(supervisor);
            course = res.course;

            await courseSubjectRepo.create({
                course: { id: course.id },
                subject: await createSubject(supervisor),
            });

            await userCourseRepo.create({
                user: { id: trainee.id },
                course: { id: course.id },
                enrollDate: new Date(),
                courseProgress: 30,
                status: EUserCourseStatus.IN_PROGRESS,
            });
        });

        it('should throw ForbiddenException if user is not supervisor of course', async () => {
            const fakeSupervisor = await createTestUser(ERolesUser.SUPERVISOR);

            const dto: FindMemberOfCourseDto = {
                page: 1,
                pageSize: 10,
                courseId: course.id,
                search: '',
            };

            await expect(service.getAllTraineeCourseForCourse(dto, fakeSupervisor)).rejects.toThrow(ForbiddenException);
        });

        it('should return trainee list successfully without filters', async () => {
            const dto: FindMemberOfCourseDto = {
                page: 1,
                pageSize: 10,
                courseId: course.id,
            };

            const result = await service.getAllTraineeCourseForCourse(dto, supervisor);
            expect(result).toBeDefined();
            expect(result.data.count).toBe(1);
            expect(result.data.items[0]).toBeInstanceOf(UserCourseResponse);
            expect(result.data.items[0].user.email).toBe(trainee.email);
        });

        it('should return trainee list filtered by search keyword', async () => {
            const dto: FindMemberOfCourseDto = {
                page: 1,
                pageSize: 10,
                courseId: course.id,
                search: trainee.name.slice(0, 4),
            };

            const result = await service.getAllTraineeCourseForCourse(dto, supervisor);
            expect(result.data.count).toBeGreaterThan(0);
            expect(result.data.items[0].user.name).toContain(dto.search);
        });

        it('should return trainee list filtered by status', async () => {
            const dto: FindMemberOfCourseDto = {
                page: 1,
                pageSize: 10,
                courseId: course.id,
                status: EUserCourseStatus.IN_PROGRESS,
            };

            const result = await service.getAllTraineeCourseForCourse(dto, supervisor);
            expect(result.data.count).toBe(1);
            expect(result.data.items[0].status).toBe('IN_PROGRESS');
        });

        it('should return trainee list filtered by search and status', async () => {
            const dto: FindMemberOfCourseDto = {
                page: 1,
                pageSize: 10,
                courseId: course.id,
                search: trainee.name,
                status: EUserCourseStatus.IN_PROGRESS,
            };

            const result = await service.getAllTraineeCourseForCourse(dto, supervisor);
            expect(result.data.count).toBe(1);
            expect(result.data.items[0].user.name).toBe(trainee.name);
            expect(result.data.items[0].status).toBe('IN_PROGRESS');
        });
    });

    describe('Export Users to Excel', () => {
        let supervisor: User;
        let trainee: User;
        let course: Course;
        let res: Partial<Response>;
        let writeMock: jest.Mock;

        beforeEach(async () => {
            supervisor = await createTestUser(ERolesUser.SUPERVISOR);
            trainee = await createTestUser(ERolesUser.TRAINEE);
            const resCourse = await createCourse(supervisor);
            course = resCourse.course;

            await courseSubjectRepo.create({
                course: { id: course.id },
                subject: await createSubject(supervisor),
            });

            await userCourseRepo.create({
                user: { id: trainee.id },
                course: { id: course.id },
                enrollDate: new Date(),
                courseProgress: 75,
                status: EUserCourseStatus.IN_PROGRESS,
            });

            res = {
                setHeader: jest.fn(),
                end: jest.fn(),
            } as any;

            // 👇 Fix lỗi mock write
            writeMock = jest.fn().mockResolvedValue(undefined);
            jest.spyOn(ExcelJS.Workbook.prototype, 'xlsx', 'get').mockReturnValue({
                write: writeMock,
            } as any);
        });

        it('should throw ForbiddenException if user is not supervisor of course', async () => {
            const fakeSupervisor = await createTestUser(ERolesUser.SUPERVISOR);
            const dto: FindMemberOfCourseDto = {
                courseId: course.id,
            };

            await expect(service.exportUsers(dto, fakeSupervisor, res as Response)).rejects.toThrow(ForbiddenException);
        });

        it('should export trainee list successfully without filters', async () => {
            const dto: FindMemberOfCourseDto = {
                courseId: course.id,
            };

            await service.exportUsers(dto, supervisor, res as Response);

            expect(res.setHeader).toHaveBeenCalledWith(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            );
            expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename=users.xlsx');
            expect(writeMock).toHaveBeenCalled();
            expect(res.end).toHaveBeenCalled();
        });

        it('should export with search filter', async () => {
            const dto: FindMemberOfCourseDto = {
                courseId: course.id,
                search: trainee.name,
            };

            await service.exportUsers(dto, supervisor, res as Response);

            expect(writeMock).toHaveBeenCalled();
            expect(res.setHeader).toHaveBeenCalled();
        });

        it('should export with status filter', async () => {
            const dto: FindMemberOfCourseDto = {
                courseId: course.id,
                status: EUserCourseStatus.IN_PROGRESS,
            };

            await service.exportUsers(dto, supervisor, res as Response);

            expect(writeMock).toHaveBeenCalled();
        });

        it('should export with both search and status filter', async () => {
            const dto: FindMemberOfCourseDto = {
                courseId: course.id,
                status: EUserCourseStatus.IN_PROGRESS,
                search: trainee.name,
            };

            await service.exportUsers(dto, supervisor, res as Response);
            expect(writeMock).toHaveBeenCalled();
        });
    });

    describe('Update Trainee Status', () => {
        let supervisor: User;
        let trainee: User;
        let course: Course;
        let userCourse: UserCourse;

        beforeEach(async () => {
            supervisor = await createTestUser(ERolesUser.SUPERVISOR);
            trainee = await createTestUser(ERolesUser.TRAINEE);
            const resCourse = await createCourse(supervisor);
            course = resCourse.course;

            await courseSubjectRepo.create({
                course: { id: course.id },
                subject: await createSubject(supervisor),
            });

            userCourse = await userCourseRepo.create({
                user: { id: trainee.id },
                course: { id: course.id },
                courseProgress: 50,
                enrollDate: new Date(),
                status: EUserCourseStatus.IN_PROGRESS,
            });
        });

        it('should update trainee status successfully', async () => {
            const dto: UpdateStatusTraineeDto = {
                status: EUserCourseStatus.PASS,
            };

            const result = await service.updateTraineeStatus(userCourse.id, supervisor, dto);
            expect(result).toBeDefined();
            expect(result.data.id).toBe(userCourse.id);
            expect(result.data.status).toBe(EUserCourseStatus.PASS);
        });

        it('should throw ForbiddenException if user is not supervisor', async () => {
            const fakeSupervisor = await createTestUser(ERolesUser.SUPERVISOR);

            const dto: UpdateStatusTraineeDto = {
                status: EUserCourseStatus.PASS,
            };

            await expect(service.updateTraineeStatus(userCourse.id, fakeSupervisor, dto)).rejects.toThrow(
                ForbiddenException,
            );
        });

        it('should throw error if userCourse not found', async () => {
            const dto: UpdateStatusTraineeDto = {
                status: EUserCourseStatus.IN_PROGRESS,
            };

            await expect(service.updateTraineeStatus(uuidv4(), supervisor, dto)).rejects.toThrow();
        });
    });

    describe('Supervisor Find Course', () => {
        let supervisor: User;

        beforeEach(async () => {
            supervisor = await createTestUser(ERolesUser.SUPERVISOR);

            // Tạo các course có cùng supervisor
            await repo.create({
                name: 'React Basics',
                description: 'Intro to React',
                startDate: '01/01/2025',
                endDate: '31/01/2025',
                creator: { id: supervisor.id },
            });

            await repo.create({
                name: 'NestJS Advanced',
                description: 'Advanced NestJS',
                startDate: '01/02/2025',
                endDate: '28/02/2025',
                creator: { id: supervisor.id },
            });

            // Gán supervisor vào các course
            const allCourses = await repo.findAll({});
            for (const course of allCourses.items) {
                await supervisorCourseRepo.create({
                    course: { id: course.id },
                    user: { id: supervisor.id },
                });
            }
        });

        it('should return courses without any filter', async () => {
            const dto: FindCourseDto = {
                page: 1,
                pageSize: 10,
            };

            const result = await service.supervisorFindCourse(dto, supervisor);

            expect(result).toBeDefined();
            expect(Array.isArray(result.data.items)).toBe(true);
            expect(result.data.count).toBeGreaterThanOrEqual(2);
        });

        it('should filter by course name', async () => {
            const dto: FindCourseDto = {
                page: 1,
                pageSize: 10,
                name: 'React',
            };

            const result = await service.supervisorFindCourse(dto, supervisor);

            expect(result.data.items.length).toBeGreaterThanOrEqual(1);
            expect(result.data.items[0].name).toContain('React');
        });

        it('should filter by creator name', async () => {
            const dto: FindCourseDto = {
                page: 1,
                pageSize: 10,
                creatorName: supervisor.name,
            };

            const result = await service.supervisorFindCourse(dto, supervisor);

            expect(result.data.items.length).toBeGreaterThanOrEqual(1);
            for (const course of result.data.items) {
                expect(course.creator.name).toBe(supervisor.name);
            }
        });

        it('should filter by both course name and creator name', async () => {
            const dto: FindCourseDto = {
                page: 1,
                pageSize: 10,
                name: 'NestJS',
                creatorName: supervisor.name,
            };

            const result = await service.supervisorFindCourse(dto, supervisor);

            expect(result.data.items.length).toBeGreaterThanOrEqual(1);
            expect(result.data.items[0].name).toContain('NestJS');
            expect(result.data.items[0].creator.name).toBe(supervisor.name);
        });

        it('should return empty if no course matched', async () => {
            const dto: FindCourseDto = {
                page: 1,
                pageSize: 10,
                name: 'NonExistentCourse',
            };

            const result = await service.supervisorFindCourse(dto, supervisor);

            expect(result.data.items.length).toBe(0);
            expect(result.data.count).toBe(0);
        });
    });

    describe('Get Course For Trainee', () => {
        let trainee: User;
        let supervisor: User;

        beforeEach(async () => {
            supervisor = await createTestUser(ERolesUser.SUPERVISOR);
            trainee = await createTestUser(ERolesUser.TRAINEE);

            const course1 = await repo.create({
                name: 'NestJS Beginner',
                description: 'Learn NestJS',
                startDate: '01/01/2025',
                endDate: '31/01/2025',
                status: ECourseStatus.ACTIVE,
                creator: { id: supervisor.id },
            });

            const course2 = await repo.create({
                name: 'React Beginner',
                description: 'Learn React',
                startDate: '01/02/2025',
                endDate: '01/03/2025',
                status: ECourseStatus.ACTIVE,
                creator: { id: supervisor.id },
            });

            await userCourseRepo.create({
                user: { id: trainee.id },
                course: { id: course1.id },
                enrollDate: new Date(),
                courseProgress: 0,
                status: EUserCourseStatus.IN_PROGRESS,
            });

            await userCourseRepo.create({
                user: { id: trainee.id },
                course: { id: course2.id },
                enrollDate: new Date(),
                courseProgress: 0,
                status: EUserCourseStatus.PASS,
            });
        });

        it('should return all active courses of trainee', async () => {
            const dto: FindCourseDto = {
                page: 1,
                pageSize: 10,
            };

            const result = await service.getCourseForTrainee(dto, trainee);
            expect(result.data.length).toBe(2);
            expect(result.data[0]).toHaveProperty('id');
            expect(result.data[0]).toHaveProperty('name');
        });

        it('should filter courses by name', async () => {
            const dto: FindCourseDto = {
                page: 1,
                pageSize: 10,
                name: 'NestJS',
            };

            const result = await service.getCourseForTrainee(dto, trainee);
            expect(result.data.length).toBe(1);
            expect(result.data[0].name).toContain('NestJS');
        });

        it('should filter courses by creator name', async () => {
            const dto: FindCourseDto = {
                page: 1,
                pageSize: 10,
                creatorName: supervisor.name,
            };

            const result = await service.getCourseForTrainee(dto, trainee);
            expect(result.data.length).toBe(2);
            expect(result.data[0].creator).toBeUndefined();
        });

        it('should return empty if no match with name filter', async () => {
            const dto: FindCourseDto = {
                page: 1,
                pageSize: 10,
                name: 'NonexistentCourse',
            };

            const result = await service.getCourseForTrainee(dto, trainee);
            expect(result.data.length).toBe(0);
        });

        it('should return empty if userCourses are all INACTIVE', async () => {
            const all = await userCourseRepo.findAll({ user: { id: trainee.id } });
            for (const uc of all.items) {
                await userCourseRepo.update(uc.id, { status: EUserCourseStatus.INACTIVE });
            }

            const dto: FindCourseDto = {
                page: 1,
                pageSize: 10,
            };

            const result = await service.getCourseForTrainee(dto, trainee);
            expect(result.data.length).toBe(0);
        });
    });

    describe('Get Course Detail For Trainee', () => {
        let trainee: User;
        let supervisor: User;
        let course: Course;

        beforeEach(async () => {
            supervisor = await createTestUser(ERolesUser.SUPERVISOR);
            trainee = await createTestUser(ERolesUser.TRAINEE);

            const res = await createCourse(supervisor);
            course = res.course;

            const subject = await createSubject(supervisor);

            const courseSubject = await courseSubjectRepo.create({
                course: { id: course.id },
                subject: { id: subject.id },
            });

            const userSubject = await userSubjectRepo.create({
                user: { id: trainee.id },
                courseSubject: { id: courseSubject.id },
            });

            const task = await creatTask(subject);

            await userTaskRepo.create({
                userSubject: { id: userSubject.id },
                task: { id: task.id },
                status: EUserTaskStatus.NOT_FINISH,
            });

            await userCourseRepo.create({
                user: { id: trainee.id },
                course: { id: course.id },
                enrollDate: new Date(),
                status: EUserCourseStatus.IN_PROGRESS,
                courseProgress: 10,
            });
        });

        it('should return course detail for valid trainee', async () => {
            const result = await service.getCourseDetailForTrainee(course.id, trainee);

            expect(result).toBeDefined();
            expect(result.data.id).toBe(course.id);
            expect(result.data.courseSubjects.length).toBeGreaterThan(0);
            const cs = result.data.courseSubjects[0];
            expect(cs.userSubjects[0].userTasks.length).toBeGreaterThan(0);
        });

        it('should throw NotFoundException if course does not exist or not active', async () => {
            await expect(service.getCourseDetailForTrainee(uuidv4(), trainee)).rejects.toThrow(NotFoundException);
        });

        it('should throw ForbiddenException if user is not a trainee of course', async () => {
            const anotherUser = await createTestUser(ERolesUser.TRAINEE);

            const dto = {
                user: { id: anotherUser.id },
                course: { id: course.id },
            };

            const existed = await userCourseRepo.findOneByCondition(dto);
            if (existed) {
                await userCourseRepo.update(existed.id, {
                    status: EUserCourseStatus.INACTIVE,
                });
            }

            await expect(service.getCourseDetailForTrainee(course.id, anotherUser)).rejects.toThrow(ForbiddenException);
        });
    });

    describe('Get Members Name of Course For Trainee', () => {
        let supervisor: User;
        let trainee: User;
        let otherTrainee: User;
        let course: Course;

        beforeEach(async () => {
            supervisor = await createTestUser(ERolesUser.SUPERVISOR);
            trainee = await createTestUser(ERolesUser.TRAINEE);
            otherTrainee = await createTestUser(ERolesUser.TRAINEE);
            const result = await createCourse(supervisor);
            course = result.course;

            await userCourseRepo.create({
                user: { id: trainee.id },
                course: { id: course.id },
                courseProgress: 50,
                enrollDate: new Date(),
            });

            await userCourseRepo.create({
                user: { id: otherTrainee.id },
                course: { id: course.id },
                courseProgress: 80,
                enrollDate: new Date(),
            });
        });

        it('should return list of member names if trainee belongs to course', async () => {
            const result = await service.getMembersNameOfCourseForTrainee(course.id, trainee);

            expect(result).toBeDefined();
            expect(Array.isArray(result.data)).toBe(true);
            expect(result.data).toContain(trainee.name);
            expect(result.data).toContain(otherTrainee.name);
            expect(result.data.length).toBe(2);
        });

        it('should throw ForbiddenException if trainee not in the course', async () => {
            const outsider = await createTestUser(ERolesUser.TRAINEE);

            await expect(service.getMembersNameOfCourseForTrainee(course.id, outsider)).rejects.toThrow(
                ForbiddenException,
            );
        });

        it('should throw NotFoundException if course does not exist', async () => {
            await expect(service.getMembersNameOfCourseForTrainee(uuidv4(), trainee)).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe('Get Course Detail For Supervisor', () => {
        let supervisor: User;
        let course: Course;

        beforeEach(async () => {
            supervisor = await createTestUser(ERolesUser.SUPERVISOR);
            const result = await createCourse(supervisor);
            course = result.course;
        });

        it('should return course detail if user is supervisor of the course', async () => {
            const result = await service.getCourseDetailForSupervisor(course.id, supervisor);

            expect(result).toBeDefined();
            expect(result.data).toBeDefined();
            expect(result.data.id).toBe(course.id);
            expect(result.data.name).toBe(course.name);
        });

        it('should throw ForbiddenException if user is not supervisor of the course', async () => {
            const outsider = await createTestUser(ERolesUser.SUPERVISOR); // user không gán vào course nào

            await expect(service.getCourseDetailForSupervisor(course.id, outsider)).rejects.toThrow(ForbiddenException);
        });
    });

    describe('Update Course Info', () => {
        let supervisor: User;
        let course: Course;

        beforeEach(async () => {
            supervisor = await createTestUser(ERolesUser.SUPERVISOR);
            const result = await createCourse(supervisor);
            course = result.course;
        });

        it('should update course info successfully', async () => {
            const dto: UpdateCourseDto = {
                name: 'Updated Course Name',
                description: 'Updated description',
                startDate: '01/12/2025',
                endDate: '10/12/2025',
            };

            const result = await service.updateCourseInfo(dto, supervisor, course.id);
            expect(result).toBeDefined();
            expect(result.data).toBeDefined();
            expect(result.data.affected).toBeGreaterThanOrEqual(1);
        });

        it('should throw UnprocessableEntityException if course has trainee studying', async () => {
            const trainee = await createTestUser(ERolesUser.TRAINEE);
            await userCourseRepo.create({
                user: { id: trainee.id },
                course: { id: course.id },
                enrollDate: new Date(),
                courseProgress: 50,
                status: EUserCourseStatus.IN_PROGRESS,
            });

            const dto: UpdateCourseDto = {
                name: 'Another Name',
            };

            await expect(service.updateCourseInfo(dto, supervisor, course.id)).rejects.toThrow(
                'courses.Can not adjust this course',
            );
        });

        it('should throw ForbiddenException if user is not supervisor of course', async () => {
            const outsider = await createTestUser(ERolesUser.SUPERVISOR);

            const dto: UpdateCourseDto = {
                name: 'Invalid update',
            };

            await expect(service.updateCourseInfo(dto, outsider, course.id)).rejects.toThrow(ForbiddenException);
        });
    });

    describe('Add Subject For Course', () => {
        let supervisor: User;
        let course: Course;
        let subject: Subject;

        beforeEach(async () => {
            supervisor = await createTestUser(ERolesUser.SUPERVISOR);
            const result = await createCourse(supervisor);
            course = result.course;
            subject = await createSubject(supervisor);
        });

        it('should add subject to course successfully', async () => {
            const dto = {
                subjectIds: [subject.id],
            };

            const result = await service.addSubjectForCourse(dto, supervisor, course.id);
            expect(result).toBeDefined();
            expect(Array.isArray(result.data)).toBe(true);
            expect(result.data.length).toBe(1);
            expect(result.data[0].subject.id).toBe(subject.id);
        });

        it('should throw UnprocessableEntityException if course has trainee', async () => {
            const trainee = await createTestUser(ERolesUser.TRAINEE);
            await userCourseRepo.create({
                user: { id: trainee.id },
                course: { id: course.id },
                enrollDate: new Date(),
                courseProgress: 0,
                status: EUserCourseStatus.IN_PROGRESS,
            });

            const dto = {
                subjectIds: [subject.id],
            };

            await expect(service.addSubjectForCourse(dto, supervisor, course.id)).rejects.toThrow(
                'courses.Can not adjust this course',
            );
        });

        it('should throw ForbiddenException if user is not supervisor of course', async () => {
            const outsider = await createTestUser(ERolesUser.SUPERVISOR);

            const dto = {
                subjectIds: [subject.id],
            };

            await expect(service.addSubjectForCourse(dto, outsider, course.id)).rejects.toThrow(ForbiddenException);
        });
    });

    describe('Delete Course', () => {
        let supervisor: User;
        let course: Course;

        beforeEach(async () => {
            supervisor = await createTestUser(ERolesUser.SUPERVISOR);
            const result = await createCourse(supervisor);
            course = result.course;
            await courseSubjectRepo.create({
                course: { id: course.id },
                subject: await createSubject(supervisor),
            });
        });

        it('should delete course successfully', async () => {
            const deleteByCourseSpy = jest
                .spyOn(service['courseSubjectService'], 'deleteByCourseId')
                .mockResolvedValue(undefined);

            const softDeleteSpy = jest.spyOn(repo, 'softDelete').mockResolvedValue({ affected: 1 } as UpdateResult);

            const result = await service.deleteCourse(course.id, supervisor);

            expect(deleteByCourseSpy).toHaveBeenCalledWith(course.id);
            expect(softDeleteSpy).toHaveBeenCalledWith(course.id);
            expect(result.data.affected).toBe(1);
        });

        it('should throw UnprocessableEntityException if course has trainee', async () => {
            const trainee = await createTestUser(ERolesUser.TRAINEE);

            await userCourseRepo.create({
                user: { id: trainee.id },
                course: { id: course.id },
                enrollDate: new Date(),
                courseProgress: 0,
                status: EUserCourseStatus.IN_PROGRESS,
            });

            await expect(service.deleteCourse(course.id, supervisor)).rejects.toThrow(
                'courses.Can not adjust this course',
            );
        });

        it('should throw ForbiddenException if user is not supervisor of course', async () => {
            const anotherSupervisor = await createTestUser(ERolesUser.SUPERVISOR);

            await expect(service.deleteCourse(course.id, anotherSupervisor)).rejects.toThrow(ForbiddenException);
        });
    });

    describe('Delete Subject for Course', () => {
        let supervisor: User;
        let course: Course;
        let subject: Subject;

        beforeEach(async () => {
            supervisor = await createTestUser(ERolesUser.SUPERVISOR);
            const courseRes = await createCourse(supervisor);
            course = courseRes.course;
            subject = await createSubject(supervisor);

            await courseSubjectRepo.create({
                course: { id: course.id },
                subject: { id: subject.id },
            });
        });

        it('should delete subject of course successfully', async () => {
            const checkCourseSpy = jest.spyOn(service as any, '_checkCourseIsStudyByTrainee').mockResolvedValue(false);

            const checkSupervisorSpy = jest
                .spyOn(service as any, '_checkUserIsSupervisorOfCourse')
                .mockResolvedValue(undefined);

            const deleteByCourseSubjectSpy = jest
                .spyOn(service['courseSubjectService'], 'deleteByCourseAndSubjectId')
                .mockResolvedValue(undefined);

            const softDeleteSpy = jest.spyOn(repo, 'softDelete').mockResolvedValue({ affected: 1 } as UpdateResult);

            const result = await service.deleteSubjectForCourse(course.id, { subjectId: subject.id }, supervisor);

            expect(checkCourseSpy).toHaveBeenCalledWith(course.id);
            expect(checkSupervisorSpy).toHaveBeenCalledWith(course.id, supervisor);
            expect(deleteByCourseSubjectSpy).toHaveBeenCalledWith(course.id, subject.id);
            expect(softDeleteSpy).toHaveBeenCalledWith(course.id);
            expect(result.data.affected).toBe(1);
        });

        it('should throw error if course is being studied by trainee', async () => {
            jest.spyOn(service as any, '_checkCourseIsStudyByTrainee').mockResolvedValue(true);

            await expect(
                service.deleteSubjectForCourse(course.id, { subjectId: subject.id }, supervisor),
            ).rejects.toThrow('courses.Can not adjust this course');
        });

        it('should throw error if user is not supervisor of course', async () => {
            jest.spyOn(service as any, '_checkCourseIsStudyByTrainee').mockResolvedValue(false);
            jest.spyOn(service as any, '_checkUserIsSupervisorOfCourse').mockImplementation(() => {
                throw new ForbiddenException('Forbidden Resource');
            });

            await expect(
                service.deleteSubjectForCourse(course.id, { subjectId: subject.id }, supervisor),
            ).rejects.toThrow(ForbiddenException);
        });
    });

    describe('Delete Trainee Of Course', () => {
        let supervisor: User;
        let trainee: User;
        let course: Course;
        let userCourse: UserCourse;

        beforeEach(async () => {
            supervisor = await createTestUser(ERolesUser.SUPERVISOR);
            trainee = await createTestUser(ERolesUser.TRAINEE);
            const result = await createCourse(supervisor);
            course = result.course;

            userCourse = await userCourseRepo.create({
                user: { id: trainee.id },
                course: { id: course.id },
                enrollDate: new Date(),
                courseProgress: 0,
            });
        });

        it('should delete trainee successfully', async () => {
            const checkSupervisorSpy = jest
                .spyOn(service as any, '_checkUserIsSupervisorOfCourse')
                .mockResolvedValue(undefined);

            const dto: DeleteTraineeDto = { userCourseId: userCourse.id };
            const result = await service.deleteTraineeOfCourse(course.id, dto, supervisor);

            expect(checkSupervisorSpy).toHaveBeenCalledWith(course.id, supervisor);
            expect(result.data).toBe(true);
        });

        it('should throw NotFoundException if userCourse not found', async () => {
            jest.spyOn(service as any, '_checkUserIsSupervisorOfCourse').mockResolvedValue(undefined);
            jest.spyOn(userCourseRepo, 'findOneByCondition').mockResolvedValue(null);

            const invalidId = uuidv4();

            const dto: DeleteTraineeDto = { userCourseId: invalidId };

            await expect(service.deleteTraineeOfCourse(course.id, dto, supervisor)).rejects.toThrow(NotFoundException);
        });

        it('should throw ForbiddenException if user is not supervisor', async () => {
            jest.spyOn(service as any, '_checkUserIsSupervisorOfCourse').mockImplementation(() => {
                throw new ForbiddenException('Forbidden Resource');
            });

            const dto: DeleteTraineeDto = { userCourseId: userCourse.id };

            await expect(service.deleteTraineeOfCourse(course.id, dto, supervisor)).rejects.toThrow(ForbiddenException);
        });
    });

    describe('addSupervisor', () => {
        let supervisor: User;
        let otherSupervisor: User;
        let course: Course;

        beforeEach(async () => {
            supervisor = await createTestUser(ERolesUser.SUPERVISOR);
            otherSupervisor = await createTestUser(ERolesUser.SUPERVISOR);
            const res = await createCourse(supervisor);
            course = res.course;
        });

        it('should throw ForbiddenException if user is not supervisor of course', async () => {
            const fakeSupervisor = await createTestUser(ERolesUser.SUPERVISOR);

            const dto = { email: otherSupervisor.email };
            await expect(service.addSupervisor(dto, course.id, fakeSupervisor)).rejects.toThrow(ForbiddenException);
        });

        it("should throw if supervisor's email is invalid", async () => {
            const dto = { email: 'invalid@example.com' };
            jest.spyOn(service as any, '_checkUserIsSupervisorOfCourse').mockResolvedValue(undefined);

            await expect(service.addSupervisor(dto, course.id, supervisor)).rejects.toThrow(
                "courses.The supervisor's email is not valid",
            );
        });

        it('should throw if user with email is not a supervisor', async () => {
            const trainee = await createTestUser(ERolesUser.TRAINEE);
            const dto = { email: trainee.email };

            await expect(service.addSupervisor(dto, course.id, supervisor)).rejects.toThrow(
                "courses.The supervisor's email is not valid",
            );
        });

        it('should throw if supervisor is already added', async () => {
            const dto = { email: otherSupervisor.email };
            await service.addSupervisor(dto, course.id, supervisor);

            await expect(service.addSupervisor(dto, course.id, supervisor)).rejects.toThrow(
                'courses.Supervisor is exsisted',
            );
        });

        it('should add supervisor successfully', async () => {
            const dto = { email: otherSupervisor.email };

            const result = await service.addSupervisor(dto, course.id, supervisor);

            expect(result.data.course.id).toEqual(course.id);
            expect(result.data.user.id).toEqual(otherSupervisor.id);
        });
    });
});
