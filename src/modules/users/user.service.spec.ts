import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '@modules/databases/databases.module';
import { ConfigModule } from '@nestjs/config';
import * as path from 'path';
import { UsersService } from './user.services';
import { userProviders } from './user.provider';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { ILike, UpdateResult } from 'typeorm';
import { EStatusUser } from './enums/index.enum';
import { UserRepository } from '@repositories/user.repository';
import { User } from './entity/user.entity';

describe('UserCourseService (Unit Test)', () => {
    let service: UsersService;
    let repo: UserRepository;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                    envFilePath: path.resolve(process.cwd(), `.env.test`),
                }),
                DatabaseModule,
            ],
            providers: [UsersService, ...userProviders],
        }).compile();

        service = module.get(UsersService);
        repo = module.get<UserRepository>('USER_REPOSITORY');
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createTrainee', () => {
        afterEach(() => {
            jest.clearAllMocks();
        });
        const dto = {
            email: 'test@example.com',
            password: 'password123',
            name: 'Trainee User',
        };

        it('should throw UnprocessableEntityException if email already exists', async () => {
            jest.spyOn(repo, 'findOneById').mockResolvedValueOnce({ id: 'existing-user-id' } as any);

            await expect(service.createTrainee(dto as any)).rejects.toThrow(UnprocessableEntityException);
        });

        it('should create new trainee with hashed password if email not exists', async () => {
            jest.spyOn(repo, 'findOneById').mockResolvedValueOnce(null);
            const hashSpy = jest.spyOn(argon2, 'hash').mockResolvedValueOnce('hashed-password');
            const createdUser = { id: 'new-user-id', ...dto, password: 'hashed-password' };

            const createSpy = jest.spyOn(repo, 'create').mockResolvedValueOnce(createdUser as any);

            const result = await service.createTrainee(dto as any);

            expect(hashSpy).toHaveBeenCalledWith(dto.password);
            expect(createSpy).toHaveBeenCalledWith({
                email: dto.email,
                password: 'hashed-password',
                name: dto.name,
            });
            expect(result).toEqual({ data: createdUser });
        });
    });

    describe('getTrainee', () => {
        afterEach(() => {
            jest.clearAllMocks();
        });

        it('should call findAll without search condition', async () => {
            const dto: PaginationDto = { page: 1, pageSize: 10 };
            const mockResult = { items: [], count: 0 };

            const findAllSpy = jest.spyOn(service, 'findAll').mockResolvedValueOnce(mockResult as any);

            const result = await service.getTrainee(dto);

            expect(findAllSpy).toHaveBeenCalledWith({}, { skip: 0, take: 10 });
            expect(result).toEqual({ data: mockResult });
        });

        it('should call findAll with search condition', async () => {
            const dto: PaginationDto = { page: 2, pageSize: 5, search: 'john' };
            const mockResult = { items: [], count: 0 };

            const findAllSpy = jest.spyOn(service, 'findAll').mockResolvedValueOnce(mockResult as any);

            const result = await service.getTrainee(dto);

            expect(findAllSpy).toHaveBeenCalledWith({ name: ILike('%john%') }, { skip: 5, take: 5 });
            expect(result).toEqual({ data: mockResult });
        });
    });

    describe('updateTrainee', () => {
        afterEach(() => {
            jest.clearAllMocks();
        });
        const traineeId = 'trainee-id';
        const dto = { name: 'Updated Name' };
        const mockTrainee = { id: traineeId, email: 'trainee@example.com' };

        it('should update trainee successfully', async () => {
            const findSpy = jest.spyOn(repo, 'findOneById').mockResolvedValue(mockTrainee as any);
            const updateUserSpy = jest.spyOn(service, 'updateUser').mockResolvedValue({
                ...mockTrainee,
                ...dto,
            } as any);

            const result = await service.updateTrainee(traineeId, dto);

            expect(findSpy).toHaveBeenCalledWith(traineeId);
            expect(updateUserSpy).toHaveBeenCalledWith(dto, mockTrainee);
            expect(result).toEqual({ ...mockTrainee, ...dto });
        });

        it('should throw NotFoundException if trainee not found', async () => {
            jest.spyOn(repo, 'findOneById').mockResolvedValue(null);

            await expect(service.updateTrainee(traineeId, dto)).rejects.toThrow(NotFoundException);
        });
    });

    describe('removeTrainee', () => {
        const traineeId = 'trainee-id';
        const mockTrainee = { id: traineeId, email: 'trainee@example.com' };

        it('should update trainee status to INACTIVE', async () => {
            const expectedResult = { affected: 1 } as UpdateResult;

            const findSpy = jest.spyOn(repo, 'findOneById').mockResolvedValue(mockTrainee as any);

            const updateSpy = jest.spyOn(repo, 'update').mockResolvedValue(expectedResult);

            const result = await service.removeTrainee(traineeId);

            expect(findSpy).toHaveBeenCalledWith(traineeId);
            expect(updateSpy).toHaveBeenCalledWith(mockTrainee.id, { status: EStatusUser.INACTIVE });
            expect(result).toEqual({ data: expectedResult });
        });

        it('should throw NotFoundException if trainee not found', async () => {
            jest.spyOn(repo, 'findOneById').mockResolvedValue(null);

            await expect(service.removeTrainee(traineeId)).rejects.toThrow(NotFoundException);
        });

        afterEach(() => {
            jest.clearAllMocks();
        });
    });

    describe('updateUser', () => {
        beforeEach(() => jest.clearAllMocks());
        it('should update user when email is unchanged', async () => {
            const user = { id: '1', email: 'user@example.com' } as User;
            const dto = { email: 'user@example.com', name: 'New Name' };
            const updatedUser = {
                id: '1',
                email: 'user@example.com',
                name: 'New Name',
            };

            const updateSpy = jest.spyOn(service['userRepository'], 'update').mockResolvedValue(undefined);
            const findSpy = jest.spyOn(service['userRepository'], 'findOneById').mockResolvedValue(updatedUser as any);

            const result = await service.updateUser(dto, user);

            expect(updateSpy).toHaveBeenCalledWith(user.id, dto);
            expect(findSpy).toHaveBeenCalledWith(user.id);
            expect(result).toMatchObject(updatedUser);
        });

        it('should update user when email is changed and new email is not used', async () => {
            const user = { id: '1', email: 'old@example.com' } as User;
            const dto = { email: 'new@example.com', name: 'Updated' };
            const updatedUser = { ...user, ...dto };

            jest.spyOn(repo, 'findOneByCondition').mockResolvedValue(null);
            jest.spyOn(repo, 'update').mockResolvedValue(undefined);
            jest.spyOn(repo, 'findOneById').mockResolvedValue(updatedUser as any);

            const result = await service.updateUser(dto, user);

            expect(repo.findOneByCondition).toHaveBeenCalledWith({ email: dto.email });
            expect(repo.update).toHaveBeenCalledWith(user.id, dto);
            expect(repo.findOneById).toHaveBeenCalledWith(user.id);
            expect(result).toEqual(updatedUser);
        });

        it('should throw UnprocessableEntityException if new email is already used', async () => {
            const user = { id: '1', email: 'old@example.com' } as User;
            const dto = { email: 'existing@example.com' };

            jest.spyOn(repo, 'findOneByCondition').mockResolvedValue({ id: '2' } as User); // email đã tồn tại

            await expect(service.updateUser(dto, user)).rejects.toThrow(UnprocessableEntityException);
            expect(repo.findOneByCondition).toHaveBeenCalledWith({ email: dto.email });
        });
    });
});
