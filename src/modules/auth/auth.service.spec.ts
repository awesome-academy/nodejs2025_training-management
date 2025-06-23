import { Test, TestingModule } from '@nestjs/testing';
import { ERolesUser, EStatusUser } from '@modules/users/enums/index.enum';
import { User } from '@modules/users/entity/user.entity';
import { DatabaseModule } from '@modules/databases/databases.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { UserRepository } from '@repositories/user.repository';
import { AuthService } from './auth.service';
import { RedisCacheModule } from '@modules/cache/cache.module';
import { QueueModule } from '@modules/queue/queue.module';
import { UserModule } from '@modules/users/user.module';
import { PassportModule } from '@nestjs/passport';
import { SessionSerializer } from './serialize/session.serialize';
import { LocalStrategy } from './strategy/session.strategy';
import { MailerModule } from '@nestjs-modules/mailer';
import { SignInDto } from './dto/auth.dto';
import { EEnvironment } from './enum/index.enum';
import { RequestWithUser } from 'src/types/requests.type';
import {
    BadRequestException,
    ForbiddenException,
    NotFoundException,
    UnauthorizedException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { EQueueName } from '@modules/queue/enum/index.enum';
import { ForgotPasswordDto } from './dto/forgotPassword.dto';
import * as argon2 from 'argon2';
import { VerifyCodeDto } from './dto/verify.dto';
import { Request } from 'express';
describe('UserCourseService (Unit Test)', () => {
    let service: AuthService;
    let userRepo: UserRepository;

    beforeEach(async () => {
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
                PassportModule.register({ session: true }),
                UserModule,
                QueueModule,
                RedisCacheModule,
            ],
            providers: [
                AuthService,
                LocalStrategy,
                SessionSerializer,
                {
                    provide: 'USER_REPOSITORY',
                    useFactory: (dataSource: DataSource) => new UserRepository(dataSource),
                    inject: ['DATA_SOURCE'],
                },
            ],
        }).compile();

        service = module.get(AuthService);
        userRepo = module.get<UserRepository>('USER_REPOSITORY');
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('SignIn', () => {
        let user: User;
        const password = '123456';
        const hashedPassword = '$2b$10$dummyhashedpassword'; // giả định đã hash

        beforeEach(async () => {
            user = await userRepo.create({
                name: 'Test User',
                email: 'test@example.com',
                password: hashedPassword,
                status: EStatusUser.ACTIVE,
                role: ERolesUser.TRAINEE,
            });

            jest.spyOn(service as any, 'verifyPassword').mockImplementation(async (plain, hash) => {
                return plain === password && hash === hashedPassword;
            });

            jest.spyOn(service as any, '_checkRoleIsSuitableWithEnvironment').mockReturnValue(true);
        });

        it('should return user if credentials are valid', async () => {
            const dto: SignInDto = {
                email: user.email,
                password,
                environment: EEnvironment.TRAINEE,
                role: ERolesUser.TRAINEE,
            };

            const result = await service.signIn(dto);
            expect(result).toBeDefined();
            expect(result.email).toEqual(user.email);
        });

        it('should throw UnauthorizedException if email does not exist', async () => {
            const dto: SignInDto = {
                email: 'notfound@example.com',
                password,
                environment: EEnvironment.TRAINEE,
                role: ERolesUser.TRAINEE,
            };

            await expect(service.signIn(dto)).rejects.toThrow('auths.Email is not exists');
        });

        it('should throw UnauthorizedException if password is incorrect', async () => {
            const dto: SignInDto = {
                email: user.email,
                password: 'wrongpassword',
                environment: EEnvironment.TRAINEE,
                role: ERolesUser.TRAINEE,
            };

            jest.spyOn(service as any, 'verifyPassword').mockResolvedValue(false);

            await expect(service.signIn(dto)).rejects.toThrow('auths.Email or Password is not correct');
        });

        it('should throw UnauthorizedException if role is not suitable with environment', async () => {
            const dto: SignInDto = {
                email: user.email,
                password,
                environment: EEnvironment.SUPERVISOR,
                role: ERolesUser.TRAINEE,
            };

            jest.spyOn(service as any, '_checkRoleIsSuitableWithEnvironment').mockReturnValue(false);

            await expect(service.signIn(dto)).rejects.toThrow('auths.Email or Password is not correct');
        });
    });

    describe('Build Login Response', () => {
        it('should return user from request', async () => {
            const mockUser = {
                id: '123',
                email: 'test@example.com',
                name: 'Test User',
                role: ERolesUser.TRAINEE,
            } as any;

            const req = {
                user: mockUser,
            } as RequestWithUser;

            const result = await service.buildLoginResponse(req);

            expect(result).toEqual({
                data: mockUser,
            });
        });
    });

    describe('handleForgotPassword', () => {
        const mockUser = {
            id: '123',
            email: 'test@example.com',
            role: ERolesUser.TRAINEE,
        };

        const email = 'test@example.com';
        const redisKey = `${mockUser.id}:code`;

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should send verification code successfully', async () => {
            jest.spyOn(service['userService'], 'findByEmail').mockResolvedValueOnce(mockUser as any);
            jest.spyOn(service['cacheService'], 'setCache').mockResolvedValueOnce(undefined);
            jest.spyOn(service['verifyService'], 'addVerifyJob').mockResolvedValueOnce(undefined);
            jest.spyOn(service['configService'], 'get').mockReturnValue('https://example.com');

            const result = await service.handleForgotPassword({ email });

            expect(result).toEqual({ data: true });
            expect(service['cacheService'].setCache).toHaveBeenCalledWith(redisKey, expect.any(String), 300);
            expect(service['verifyService'].addVerifyJob).toHaveBeenCalledWith({
                link: expect.stringContaining(`code=`),
                email: email.toLowerCase(),
                queueName: EQueueName.ForgotPassword,
            });
        });

        it('should throw NotFoundException if user not found', async () => {
            jest.spyOn(service['userService'], 'findByEmail').mockResolvedValueOnce(null);

            await expect(service.handleForgotPassword({ email })).rejects.toThrowError(
                new NotFoundException('auths.Email is not exists'),
            );
        });

        it('should throw NotFoundException if something fails while sending code', async () => {
            jest.spyOn(service['userService'], 'findByEmail').mockResolvedValueOnce(mockUser as any);
            jest.spyOn(service['cacheService'], 'setCache').mockRejectedValueOnce(new Error('fail'));

            await expect(service.handleForgotPassword({ email })).rejects.toThrowError(
                new NotFoundException('auths.An error occurred while sending the verification code'),
            );
        });
    });

    describe('updatePasswordByCode', () => {
        const mockUser = {
            id: '123',
            email: 'test@example.com',
            password: 'hashed-old-password',
            role: ERolesUser.SUPERVISOR,
        };

        const dto: ForgotPasswordDto = {
            email: 'test@example.com',
            password: 'newPassword123',
            code: '654321',
            environment: EEnvironment.SUPERVISOR,
        };

        beforeEach(() => jest.clearAllMocks());

        it('should throw NotFoundException if user not found', async () => {
            jest.spyOn(service['userService'], 'findByEmail').mockResolvedValueOnce(null);

            await expect(service.updatePasswordByCode(dto)).rejects.toThrow(NotFoundException);
        });

        it('should throw ForbiddenException if user role not match (SUPERVISOR)', async () => {
            const invalidUser = { ...mockUser, role: ERolesUser.TRAINEE };
            jest.spyOn(service['userService'], 'findByEmail').mockResolvedValueOnce(invalidUser as any);

            await expect(service.updatePasswordByCode(dto)).rejects.toThrow(ForbiddenException);
        });

        it('should throw ForbiddenException if user role not match (TRAINEE)', async () => {
            const traineeDto = { ...dto, environment: EEnvironment.TRAINEE };
            const invalidUser = { ...mockUser, role: ERolesUser.SUPERVISOR };
            jest.spyOn(service['userService'], 'findByEmail').mockResolvedValueOnce(invalidUser as any);

            await expect(service.updatePasswordByCode(traineeDto)).rejects.toThrow(ForbiddenException);
        });

        it('should throw UnprocessableEntityException if code is invalid', async () => {
            jest.spyOn(service['userService'], 'findByEmail').mockResolvedValueOnce(mockUser as any);
            jest.spyOn(service['cacheService'], 'getCache').mockResolvedValueOnce('000000');

            await expect(service.updatePasswordByCode(dto)).rejects.toThrow(UnprocessableEntityException);
        });

        it('should update password successfully with valid code and role', async () => {
            const updatedUser = { ...mockUser, password: 'newHashedPassword' };

            jest.spyOn(service['userService'], 'findByEmail').mockResolvedValueOnce(mockUser as any);
            jest.spyOn(service['cacheService'], 'getCache').mockResolvedValueOnce(dto.code);
            jest.spyOn(argon2, 'hash').mockResolvedValueOnce('newHashedPassword');
            jest.spyOn(service['userService'], 'update').mockResolvedValueOnce(updatedUser as any);
            const deleteCacheSpy = jest.spyOn(service['cacheService'], 'deleteCache').mockResolvedValueOnce(undefined);

            const result = await service.updatePasswordByCode(dto);

            expect(result.data).toEqual(updatedUser);
            expect(deleteCacheSpy).toHaveBeenCalledWith(`${mockUser.id}:code`);
        });
    });

    describe('handleSendCode', () => {
        const mockUser = {
            id: '123',
            email: 'test@example.com',
            password: 'hashed-old-password',
            role: ERolesUser.SUPERVISOR,
        };

        const dto: ForgotPasswordDto = {
            email: 'test@example.com',
            password: 'newPassword123',
            code: '654321',
            environment: EEnvironment.SUPERVISOR,
        };

        beforeEach(() => jest.clearAllMocks());

        it('should send code successfully', async () => {
            jest.spyOn(service['userService'], 'findByEmail').mockResolvedValueOnce(mockUser as any);
            jest.spyOn(service['cacheService'], 'setCache').mockResolvedValueOnce(undefined);
            const addVerifyJobSpy = jest
                .spyOn(service['verifyService'], 'addVerifyJob')
                .mockResolvedValueOnce(undefined);

            const result = await service.handleSendCode(dto);

            expect(result).toEqual({ data: true });
            expect(service['cacheService'].setCache).toHaveBeenCalledWith(
                `${mockUser.id}:code`,
                expect.stringMatching(/^\d{6}$/),
                300,
            );
            expect(addVerifyJobSpy).toHaveBeenCalledWith({
                code: expect.stringMatching(/^\d{6}$/),
                email: mockUser.email.toLowerCase(),
                queueName: EQueueName.VerifyEmail,
            });
        });

        it('should throw NotFoundException if sending code fails', async () => {
            jest.spyOn(service['userService'], 'findByEmail').mockResolvedValueOnce(mockUser as any);
            jest.spyOn(service['cacheService'], 'setCache').mockRejectedValueOnce(new Error('Redis error'));

            await expect(service.handleSendCode(dto)).rejects.toThrow(NotFoundException);
        });
    });

    describe('verifyCode', () => {
        const mockUser = {
            id: 'user123',
            email: 'test@example.com',
            status: EStatusUser.INACTIVE,
        };

        const mockUpdatedUser = {
            ...mockUser,
            status: EStatusUser.ACTIVE,
        };

        const dto: VerifyCodeDto = {
            email: mockUser.email,
            code: 123456,
        };
        beforeEach(() => jest.clearAllMocks());

        it('should return user if code is valid and user is already active', async () => {
            const activeUser = { ...mockUser, status: EStatusUser.ACTIVE };

            jest.spyOn(service['userService'], 'findByEmail').mockResolvedValueOnce(activeUser as any);
            jest.spyOn(service['cacheService'], 'getCache').mockResolvedValueOnce('123456');

            const result = await service.verifyCode(dto);

            expect(result).toEqual({ data: activeUser });
            expect(service['cacheService'].getCache).toHaveBeenCalledWith(`${activeUser.id}:code`);
        });

        it('should update user status if code is valid and user is inactive', async () => {
            jest.spyOn(service['userService'], 'findByEmail').mockResolvedValueOnce(mockUser as any);
            jest.spyOn(service['cacheService'], 'getCache').mockResolvedValueOnce('123456');
            const updateSpy = jest
                .spyOn(service['userService'], 'update')
                .mockResolvedValueOnce(mockUpdatedUser as any);

            const result = await service.verifyCode(dto);

            expect(result).toEqual({ data: mockUpdatedUser });
            expect(updateSpy).toHaveBeenCalledWith(mockUser.id, { status: EStatusUser.ACTIVE });
        });

        it('should throw UnauthorizedException if code does not match', async () => {
            jest.spyOn(service['userService'], 'findByEmail').mockResolvedValueOnce(mockUser as any);
            jest.spyOn(service['cacheService'], 'getCache').mockResolvedValueOnce('000000');

            await expect(service.verifyCode(dto)).rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException if code is missing in Redis', async () => {
            jest.spyOn(service['userService'], 'findByEmail').mockResolvedValueOnce(mockUser as any);
            jest.spyOn(service['cacheService'], 'getCache').mockResolvedValueOnce(null);

            await expect(service.verifyCode(dto)).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('verifyPassword', () => {
        it('should return true if password is correct', async () => {
            jest.spyOn(argon2, 'verify').mockResolvedValueOnce(true);

            const result = await service.verifyPassword('password123', 'hashedPassword');
            expect(result).toBe(true);
        });

        it('should return false if password is incorrect', async () => {
            jest.spyOn(argon2, 'verify').mockResolvedValueOnce(false);

            const result = await service.verifyPassword('wrongpassword', 'hashedPassword');
            expect(result).toBe(false);
        });

        it('should return false if argon2.verify throws error', async () => {
            jest.spyOn(argon2, 'verify').mockRejectedValueOnce(new Error('Some error'));

            const result = await service.verifyPassword('password123', 'hashedPassword');
            expect(result).toBe(false);
        });
    });

    describe('checkLoginStatus', () => {
        it('should return true if user is logged in', async () => {
            const mockRequest = {
                user: {
                    id: '123',
                    email: 'test@example.com',
                    role: 'SUPERVISOR',
                },
            } as any;

            const result = await service.checkLoginStatus(mockRequest);
            expect(result).toEqual({ data: true });
        });

        it('should return false if user is not logged in', async () => {
            const mockRequest = {
                user: undefined,
            } as any;

            const result = await service.checkLoginStatus(mockRequest);
            expect(result).toEqual({ data: false });
        });
    });

    describe('updatePassword', () => {
        it('should throw BadRequestException if old password matches current password', async () => {
            const dto = {
                oldPassword: 'same-password',
                newPassword: 'same-password',
            };
            const user = {
                id: 'user-id',
                password: 'same-password',
            };

            await expect(service.updatePassword(dto, user as any)).rejects.toThrow(BadRequestException);
        });

        it('should hash new password and update user successfully', async () => {
            const dto = {
                oldPassword: 'old-password',
                newPassword: 'new-password',
            };
            const user = {
                id: 'user-id',
                password: 'hashed-old-password',
            };

            const updatedUser = {
                id: user.id,
                password: 'hashed-new-password',
            };

            const hashSpy = jest.spyOn(argon2, 'hash').mockResolvedValue('hashed-new-password');

            const updateSpy = jest.spyOn(service['userService'], 'update').mockResolvedValue(updatedUser as any);

            const result = await service.updatePassword(dto, user as any);

            expect(hashSpy).toHaveBeenCalledWith('new-password');
            expect(updateSpy).toHaveBeenCalledWith(user.id, {
                password: 'hashed-new-password',
            });
            expect(result).toEqual({ data: updatedUser });
        });
    });

    describe('AuthService - logout', () => {
        it('should resolve with logout message on successful session destroy', async () => {
            const mockRequest = {
                session: {
                    destroy: jest.fn((cb) => cb(null)),
                },
            } as unknown as Request;

            const result = await service.logout(mockRequest as any);

            expect(result).toEqual({ message: 'Logout' });
            expect(mockRequest.session.destroy).toHaveBeenCalled();
        });

        it('should reject with error on session destroy failure', async () => {
            const mockError = new Error('Session destroy failed');
            const mockRequest = {
                session: {
                    destroy: jest.fn((cb) => cb(mockError)),
                },
            } as unknown as Request;

            await expect(service.logout(mockRequest as any)).rejects.toThrow(mockError);
            expect(mockRequest.session.destroy).toHaveBeenCalled();
        });
    });
});
