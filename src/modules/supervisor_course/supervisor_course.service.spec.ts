import { Test, TestingModule } from '@nestjs/testing';
import { ERolesUser, EStatusUser } from '@modules/users/enums/index.enum';
import { User } from '@modules/users/entity/user.entity';
import { DatabaseModule } from '@modules/databases/databases.module';
import { ConfigModule } from '@nestjs/config';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { CourseRepository } from '@repositories/course.repository';
import { UserRepository } from '@repositories/user.repository';
import { supervisorCourseProviders } from './supervisor_course.provider';
import { SupervisorCourseService } from './supervisor_course.service';
import { SupervisorCourseRepository } from '@repositories/supervisor_course.repository';
import { ForbiddenException } from '@nestjs/common';
import { SupervisorCourse } from './entity/supervisor_course.entity';
import { Course } from '@modules/courses/entity/course.entity';

describe('SupervisorCourseService (Unit Test)', () => {
    let service: SupervisorCourseService;
    let repo: SupervisorCourseRepository;
    let userRepo: UserRepository;
    let courseRepo: CourseRepository;

    const getInfoTestUserByRole = (role: ERolesUser): { name: string; email: string } => {
        switch (role) {
            case ERolesUser.SUPERVISOR:
                return { name: 'Supervisor Test', email: 'testsupervisor@gmail.com' };
            case ERolesUser.TRAINEE:
                return { name: 'Trainee Test', email: 'testtrainee@gmail.com' };
        }
    };

    const createTestUser = async (role: ERolesUser): Promise<User> => {
        return await userRepo.create({
            status: EStatusUser.ACTIVE,
            role,
            password: '123456',
            ...getInfoTestUserByRole(role),
        });
    };

    const createCourse = async (user: User, name?: string): Promise<any> => {
        return await courseRepo.create({
            name: name ?? randomName(),
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

    const createSupervisorCourse = async () => {
        const supervisorUser = await createTestUser(ERolesUser.SUPERVISOR);
        const course = await createCourse(supervisorUser);

        const supervisorCourse = await repo.create({
            user: { id: supervisorUser.id },
            course: { id: course.id },
        });

        return {
            supervisorUser,
            course,
            supervisorCourse,
        };
    };

    const clearData = async (users: User[], courses: Course[], supervisorCourses: SupervisorCourse[]) => {
        await Promise.all([
            ...supervisorCourses.map((supervisorCourse) => repo.softDelete(supervisorCourse.id)),
            ...users.map((user) => userRepo.softDelete(user.id)),
            ...courses.map((course) => courseRepo.softDelete(course.id)),
        ]);
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
                ...supervisorCourseProviders,
                SupervisorCourseService,
                {
                    provide: 'COURSE_REPOSITORY',
                    useFactory: (dataSource: DataSource) => {
                        return new CourseRepository(dataSource);
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
            ],
        }).compile();

        service = module.get<SupervisorCourseService>(SupervisorCourseService);
        repo = module.get<SupervisorCourseRepository>('SUPERVISOR_COURSE_REPOSITORY');
        userRepo = module.get<UserRepository>('USER_REPOSITORY');
        courseRepo = module.get<CourseRepository>('COURSE_REPOSITORY');
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('get all supervisors of a course', () => {
        it('should create successfully', async () => {
            const { supervisorUser, course, supervisorCourse } = await createSupervisorCourse();
            const dto = {
                page: 1,
                pageSize: 10,
                search: '',
                courseId: course.id,
            };

            const result = await service.getAllSupervisorOfCourse(dto, supervisorUser);

            expect(result.data).toBeDefined();
            expect(Array.isArray(result.data.items)).toBe(true);
            expect(result.data.items.length).toBeGreaterThanOrEqual(1);
            expect(result.data.items[0]).toHaveProperty('user');
            expect(result.data.items[0]).toHaveProperty('course');

            await clearData([supervisorUser], [course], [supervisorCourse]);
        });

        it('should return empty items if no supervisor matches search', async () => {
            const { supervisorUser, course, supervisorCourse } = await createSupervisorCourse();

            const dto = {
                page: 1,
                pageSize: 10,
                search: 'NoMatchName123',
                courseId: course.id,
            };

            const result = await service.getAllSupervisorOfCourse(dto, supervisorUser);

            expect(result.data).toBeDefined();
            expect(result.data.items).toHaveLength(0);
            expect(result.data.count).toBe(0);

            await clearData([supervisorUser], [course], [supervisorCourse]);
        });

        it('should paginate results correctly', async () => {
            const { supervisorUser, course, supervisorCourse } = await createSupervisorCourse();

            const dto = {
                page: 1,
                pageSize: 1,
                search: '',
                courseId: course.id,
            };

            const result = await service.getAllSupervisorOfCourse(dto, supervisorUser);

            expect(result.data.items.length).toBeLessThanOrEqual(1);
            expect(result.data.count).toBeGreaterThanOrEqual(result.data.items.length);

            await clearData([supervisorUser], [course], [supervisorCourse]);
        });

        it('should throw ForbiddenException if user is not a supervisor of course', async () => {
            const { supervisorUser, course, supervisorCourse } = await createSupervisorCourse();
            const dto = {
                page: 1,
                pageSize: 10,
                search: '',
                courseId: course.id,
            };

            const otherUser = await createTestUser(ERolesUser.SUPERVISOR);

            await expect(service.getAllSupervisorOfCourse(dto, otherUser)).rejects.toThrow(ForbiddenException);

            await clearData([supervisorUser, otherUser], [course], [supervisorCourse]);
        });
    });
});
