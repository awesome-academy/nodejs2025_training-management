import { Test, TestingModule } from '@nestjs/testing';
import { ERolesUser, EStatusUser } from '@modules/users/enums/index.enum';
import { User } from '@modules/users/entity/user.entity';
import { DatabaseModule } from '@modules/databases/databases.module';
import { SharedModule } from '@modules/shared/shared.module';
import { ConfigModule } from '@nestjs/config';
import * as path from 'path';
import { SubjectRepository } from '@repositories/subject.repository';
import { DataSource } from 'typeorm';
import { CourseRepository } from '@repositories/course.repository';
import { UserCourseService } from './user_course.service';
import { UserCourseRepository } from '@repositories/user_course.repository';
import { UserRepository } from '@repositories/user.repository';
import { userCourseProviders } from './user_course.provider';
import { Subject } from '@modules/subjects/entity/subject.entity';
import { EUserCourseStatus } from './enum/index.enum';
import { UnprocessableEntityException } from '@nestjs/common';

describe('UserCourseService (Unit Test)', () => {
    let service: UserCourseService;
    let repo: UserCourseRepository;
    let userRepo: UserRepository;
    let courseRepo: CourseRepository;
    let subjectRepo: SubjectRepository;

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

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                    envFilePath: path.resolve(process.cwd(), `.env.test`),
                }),
                DatabaseModule,
                SharedModule,
            ],
            providers: [
                ...userCourseProviders,
                UserCourseService,
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
            ],
        }).compile();

        service = module.get(UserCourseService);
        repo = module.get<UserCourseRepository>('USER_COURSE_REPOSITORY');
        userRepo = module.get<UserRepository>('USER_REPOSITORY');
        courseRepo = module.get<CourseRepository>('COURSE_REPOSITORY');
        subjectRepo = module.get<SubjectRepository>('SUBJECT_REPOSITORY');
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('Add Trainee For Course', () => {
        it('should create successfully', async () => {
            const supervisor = await createTestUser(ERolesUser.SUPERVISOR);
            const subject = await createSubject(supervisor);
            const course = await createCourse(subject, supervisor);
            const trainee = await createTestUser(ERolesUser.TRAINEE);

            const userCourse = await service.handleAddTraineeForCourse(trainee, course.id);

            expect(userCourse.status).toEqual(EUserCourseStatus.IN_PROGRESS);
            expect(userCourse.courseProgress).toEqual(0);
            expect(userCourse.course.id).toEqual(course.id);
            expect(userCourse.user.id).toEqual(trainee.id);

            await subjectRepo.softDelete(subject.id);
            await courseRepo.softDelete(course.id);
            await userRepo.softDelete(supervisor.id);
            await userRepo.softDelete(trainee.id);
            await repo.softDelete(userCourse.id);
        });

        it('should throw exception if trainee enrolled the course', async () => {
            const supervisor = await createTestUser(ERolesUser.SUPERVISOR);
            const subject = await createSubject(supervisor);
            const course = await createCourse(subject, supervisor);
            const trainee = await createTestUser(ERolesUser.TRAINEE);

            const userCourse = await service.handleAddTraineeForCourse(trainee, course.id);

            const anothercourse = await createCourse(subject, supervisor);

            await expect(service.handleAddTraineeForCourse(trainee, anothercourse.id)).rejects.toThrow(
                UnprocessableEntityException,
            );

            await subjectRepo.softDelete(subject.id);
            await courseRepo.softDelete(course.id);
            await courseRepo.softDelete(anothercourse.id);
            await userRepo.softDelete(supervisor.id);
            await userRepo.softDelete(trainee.id);
            await repo.softDelete(userCourse.id);
        });

        it('should throw exception if trainee enrolled another course', async () => {
            const supervisor = await createTestUser(ERolesUser.SUPERVISOR);
            const subject = await createSubject(supervisor);
            const course = await createCourse(subject, supervisor);
            const trainee = await createTestUser(ERolesUser.TRAINEE);

            const userCourse = await service.handleAddTraineeForCourse(trainee, course.id);

            const anothercourse = await createCourse(subject, supervisor);

            await expect(service.handleAddTraineeForCourse(trainee, anothercourse.id)).rejects.toThrow(
                UnprocessableEntityException,
            );

            await subjectRepo.softDelete(subject.id);
            await courseRepo.softDelete(course.id);
            await courseRepo.softDelete(anothercourse.id);
            await userRepo.softDelete(supervisor.id);
            await userRepo.softDelete(trainee.id);
            await repo.softDelete(userCourse.id);
        });
    });

    describe('Update Course Progress', () => {
        it('should update user course progress', async () => {
            const progress = 75;
            const supervisor = await createTestUser(ERolesUser.SUPERVISOR);
            const subject = await createSubject(supervisor);
            const course = await createCourse(subject, supervisor);
            const trainee = await createTestUser(ERolesUser.TRAINEE);

            const userCourse = await service.handleAddTraineeForCourse(trainee, course.id);

            await service.updateUserCourseProgress(course.id, trainee.id, progress, false);

            let updatedUserCourse = await repo.findOneById(userCourse.id);

            expect(updatedUserCourse.courseProgress).toEqual(progress);

            await service.updateUserCourseProgress(course.id, trainee.id, 100, true);

            updatedUserCourse = await repo.findOneById(userCourse.id);

            expect(updatedUserCourse.courseProgress).toEqual(100);

            expect(updatedUserCourse.status).toEqual(EUserCourseStatus.PASS);
        });
    });
});
