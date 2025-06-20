import { Test, TestingModule } from '@nestjs/testing';
import { SubjectService } from './subjects.service';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
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

describe('SubjectService (Unit Test)', () => {
    let service: SubjectService;

    const mockSubject = {
        name: 'Math',
        description: 'Math subject',
    };

    const mockUser = {
        id: '45e31d0e-dad3-4564-84fa-127d817332ee',
        name: 'supervisor',
        role: ERolesUser.SUPERVISOR,
        email: 'supervisor@gmail.com',
        status: EStatusUser.ACTIVE,
        password: '$argon2id$v=19$m=65536,t=3,p=4$rU9R0KjvWZg/Igb4maka6g$DQPz2uglX5v1rfLB7hAqxGw5T3vWei06+fbo2nuw6/Y',
        createdAt: new Date('2025-06-19T07:57:30.122Z'),
        deletedAt: null,
    } as User;

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
                CourseSubjectModule,
            ],
            providers: [SubjectService, ...subjectProviders],
        }).compile();

        service = module.get<SubjectService>(SubjectService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createSubject', () => {
        it('should create and return a subject', async () => {
            const dto = {
                name: 'Math',
                description: 'Math subject',
                creator: {
                    id: '45e31d0e-dad3-4564-84fa-127d817332ee',
                },
                tasks: [
                    {
                        contentFileLink: 'https://www.youtube.com/watch?v=2rduCeh-04M',
                        title: 'Devops',
                    },
                    {
                        contentFileLink: 'https://www.youtube.com/watch?v=2rduCeh-04M',
                        title: 'CI CD',
                    },
                ],
            };
            const subject = (await service.createSubject(dto, mockUser)).data;
            expect(subject.name).toEqual(mockSubject.name);
            expect(subject.description).toEqual(mockSubject.description);
            expect(subject.creator).toEqual(mockUser);
        });
    });

    describe('getSubjectById', () => {
        it('should return subject by ID', async () => {
            const mockResponse = {
                id: '1205d7aa-489c-4307-b9e4-02cd0f0d4d64',
                name: 'Devops',
                description: 'Devops',
                tasksCreated: [
                    {
                        id: '98d4a949-8b33-48a9-84df-116502a5d9af',
                        title: 'Devops',
                        contentFileLink: 'https://www.youtube.com/watch?v=2rduCeh-04M',
                        createdAt: '2025-06-19T08:01:23.707Z',
                        deletedAt: null,
                    },
                    {
                        id: 'acdcb15d-ae97-4800-88d9-4a2fbecd9902',
                        title: 'Sample Task',
                        contentFileLink: 'https://www.youtube.com/watch?v=2rduCeh-04M',
                        createdAt: '2025-06-19T08:24:29.747Z',
                        deletedAt: null,
                    },
                ],
            };
            const subjectId = '1205d7aa-489c-4307-b9e4-02cd0f0d4d64';
            const result = (await service.getSubjectDetail(subjectId, mockUser)).data;
            const plainResult = {
                ...result,
                tasksCreated: result.tasksCreated.map((task) => ({
                    ...task,
                    createdAt: task.createdAt.toISOString(),
                })),
            };
            expect(plainResult).toMatchObject(mockResponse);
        });

        it('should throw NotFoundException if not found', async () => {
            const invalidId = '1205d7aa-489c-4307-b9e4-02cd0f0d4d65';
            await expect(service.getSubjectDetail(invalidId, mockUser)).rejects.toThrow(NotFoundException);
        });
    });

    describe('getAllSubjects', () => {
        it('should return subject list by pagination strategy', async () => {
            const mockResult = {
                count: 3,
                items: [
                    {
                        description: 'Test With Trainee',
                        id: '68c08c0b-98d8-479e-ac55-eec7b0fab985',
                        name: 'Test With Trainee',
                        createdAt: new Date('2025-06-20T02:00:13.641Z'),
                        deletedAt: null,
                    },
                ],
            };
            const dto = {
                page: 1,
                pageSize: 1,
            };

            const result = (await service.getSubjectList(dto, mockUser)).data;
            expect(result).toMatchObject(mockResult);
        });

        it('should not return any subject list by pagination strategy', async () => {
            const mockResult = {
                count: 0,
                items: [],
            };
            const dto = {
                page: 1,
                pageSize: 1,
                name: '123',
            };

            const result = (await service.getSubjectList(dto, mockUser)).data;
            expect(result).toEqual(mockResult);
        });
    });

    describe('updateSubject', () => {
        it('should update and return updated subject', async () => {
            const subjectId = '06eaba35-3894-4e54-9e2d-abc434d05d47';

            const dto = {
                name: 'Subject 2',
                description: 'Description 2',
            };

            await service.updateSubjectInfo(subjectId, dto);
            const subjectUpdated = await service.findOne(subjectId);
            expect(subjectUpdated.name).toEqual(dto.name);
            expect(subjectUpdated.description).toEqual(dto.description);
        });

        it('can not update info if at least one trainee has learnt', async () => {
            const subjectId = '68c08c0b-98d8-479e-ac55-eec7b0fab985';

            const dto = {
                name: 'Subject 1',
                description: 'Description 1',
            };

            await expect(service.updateSubjectInfo(subjectId, dto)).rejects.toThrow(UnprocessableEntityException);
        });
    });

    describe('updateSubjectTask', () => {
        it('should update and return updated subject', async () => {
            const subjectId = '06eaba35-3894-4e54-9e2d-abc434d05d47';

            const dto = {
                tasks: [
                    {
                        title: 'Test Tasks',
                        contentFileLink: 'https://www.youtube.com/watch?v=2rduCeh-04M',
                    },
                ],
            };

            const tasks = (await service.addTaskForSubject(subjectId, dto)).data;
            expect(tasks.length).toEqual(dto.tasks.length);
            tasks.map((task) => expect(task.subject.id).toEqual(subjectId));
        });

        it('can not update info if at least one trainee has learnt', async () => {
            const subjectId = '68c08c0b-98d8-479e-ac55-eec7b0fab985';

            const dto = {
                tasks: [
                    {
                        title: 'Test Tasks When have at least trainee',
                        contentFileLink: 'https://www.youtube.com/watch?v=2rduCeh-04M',
                    },
                ],
            };

            await expect(service.addTaskForSubject(subjectId, dto)).rejects.toThrow(UnprocessableEntityException);
        });
    });

    describe('deleteSubject', () => {
        it('should delete subject successfully', async () => {
            const subjectId = '06eaba35-3894-4e54-9e2d-abc434d05d47';
            const updateResult = (await service.deleteSubject(subjectId, mockUser)).data;
            expect(updateResult.affected).toEqual(1);
        });

        it('can not delete info if at least one trainee has learnt', async () => {
            const subjectId = '68c08c0b-98d8-479e-ac55-eec7b0fab985';
            await expect(service.deleteSubject(subjectId, mockUser)).rejects.toThrow(UnprocessableEntityException);
        });
    });
});
