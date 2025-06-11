import { UsersService } from '@modules/users/user.services';
import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
    Req,
    UnauthorizedException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { SignInDto, SignUpDto } from './dto/auth.dto';
import * as argon2 from 'argon2';
import { User } from '@modules/users/entity/user.entity';
import { EEnvironment } from './enum/index.enum';
import { ERolesUser, EStatusUser } from '@modules/users/enums/index.enum';
import { CacheService } from '@modules/cache/cache.service';
import { SendCodeDto, VerifyCodeDto } from './dto/verify.dto';
import { QueueService } from '@modules/queue/queue.service';
import { RequestWithUser } from 'src/types/requests.type';
import { AppResponse, ResponseMessage } from 'src/types/common.type';
import { Request } from 'express';
import { EQueueName } from '@modules/queue/enum/index.enum';
import { ForgotPasswordDto } from './dto/forgotPassword.dto';
import { FORGOTPASSWORD_ENDPOINT } from 'src/constants/contants';
import { ConfigService } from '@nestjs/config';
import { UpdatePasswordDto } from './dto/updatePassword.dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UsersService,
        private readonly cacheService: CacheService,
        private readonly verifyService: QueueService,
        private readonly configService: ConfigService,
    ) {}

    async signIn(dto: SignInDto): Promise<User> {
        const { email, password, environment } = dto;
        const user: User = await this.userService.findByEmail(email);
        if (!user) {
            throw new UnauthorizedException('auths.Email is not exists');
        }
        const passwordIsCorrect: boolean = await this.verifyPassword(password, user.password);
        if (!passwordIsCorrect) {
            throw new UnauthorizedException('auths.Email or Password is not correct');
        }
        const checkRoleIsSuitableWithEnvironment: boolean = this._checkRoleIsSuitableWithEnvironment(
            environment,
            user.role,
        );
        if (!checkRoleIsSuitableWithEnvironment) {
            throw new UnauthorizedException('auths.Email or Password is not correct');
        }
        return user;
    }

    async buildLoginResponse(req: RequestWithUser): Promise<AppResponse<User>> {
        return {
            data: req.user,
        };
    }

    _getUserRoleFromEnvironment(environment: EEnvironment): ERolesUser {
        switch (environment) {
            case EEnvironment.SUPERVISOR:
                return ERolesUser.SUPERVISOR;
            case EEnvironment.TRAINEE:
                return ERolesUser.TRAINEE;
        }
    }

    _checkRoleIsSuitableWithEnvironment(environment: EEnvironment, role: ERolesUser): boolean {
        if (
            (environment === EEnvironment.SUPERVISOR && role === ERolesUser.SUPERVISOR) ||
            (environment === EEnvironment.TRAINEE && role === ERolesUser.TRAINEE)
        ) {
            return true;
        }
        return false;
    }

    async signUp(dto: SignUpDto): Promise<AppResponse<User>> {
        const { email, password, name, environment, role } = dto;
        if (!this._checkRoleIsSuitableWithEnvironment(environment, role)) {
            throw new UnprocessableEntityException('auths.Please using correct platform');
        }
        const user: User = await this.userService.findByEmail(email);
        if (user) {
            throw new NotFoundException('auths.Email is exists');
        }
        const hashedPassword: string = await argon2.hash(password);
        const newUser = await this.userService.create({
            email,
            password: hashedPassword,
            name,
            status: role === ERolesUser.SUPERVISOR ? EStatusUser.INACTIVE : EStatusUser.ACTIVE,
            role,
        });
        if (role === ERolesUser.SUPERVISOR) {
            await this.handleSendCode({ email });
        }
        return {
            data: newUser,
        };
    }

    async handleForgotPassword({ email }: SendCodeDto): Promise<AppResponse<boolean>> {
        const user = await this.userService.findByEmail(email);
        if (!user) {
            throw new NotFoundException('auths.Email is not exists');
        }
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const redisKey = `${user.id}:code`;
        try {
            await this.cacheService.setCache(redisKey, code, 300);
            await this.verifyService.addVerifyJob({
                link: `${this.configService.get<string>('FORGOTPASSWORD_DOMAIN')}/${FORGOTPASSWORD_ENDPOINT}?email=${email}&code=${code}`,
                email: email.toLowerCase(),
                queueName: EQueueName.ForgotPassword,
            });

            return {
                data: true,
            };
        } catch (error) {
            throw new NotFoundException('auths.An error occurred while sending the verification code');
        }
    }

    async updatePasswordByCode(dto: ForgotPasswordDto): Promise<AppResponse<User>> {
        const { email, password, code, environment } = dto;
        const user = await this.userService.findByEmail(email);
        if (!user) throw new NotFoundException('users.user not found');
        switch (environment) {
            case EEnvironment.SUPERVISOR:
                if (user.role !== ERolesUser.SUPERVISOR) {
                    throw new ForbiddenException('Forbidden Resource');
                }
                break;
            case EEnvironment.TRAINEE:
                if (user.role !== ERolesUser.TRAINEE) {
                    throw new ForbiddenException('Forbidden Resource');
                }
                break;
        }
        const codeInRedis = await this.cacheService.getCache(`${user.id}:code`);
        if (code.toString() !== codeInRedis.toString()) {
            throw new UnprocessableEntityException('auths.invalid code');
        }
        const hashedPassword = await argon2.hash(password);
        const updatedUser = await this.userService.update(user.id, {
            password: hashedPassword,
        });
        await this.cacheService.deleteCache(`${user.id}:code`);
        return {
            data: updatedUser,
        };
    }

    async handleSendCode({ email }: SendCodeDto): Promise<AppResponse<boolean>> {
        const user = await this.userService.findByEmail(email);
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const redisKey = `${user.id}:code`;
        try {
            await this.cacheService.setCache(redisKey, code, 300);
            await this.verifyService.addVerifyJob({
                code,
                email: email.toLowerCase(),
                queueName: EQueueName.VerifyEmail,
            });

            return {
                data: true,
            };
        } catch (error) {
            throw new NotFoundException('auths.An error occurred while sending the verification code');
        }
    }

    async verifyCode({ email, code }: VerifyCodeDto): Promise<AppResponse<User>> {
        const user = await this.userService.findByEmail(email);
        const redisKey = `${user.id}:code`;
        const codeInRedis = await this.cacheService.getCache(redisKey);
        if (!codeInRedis || code.toString() !== codeInRedis.toString()) {
            throw new UnauthorizedException('auths.Invalid code');
        }

        if (user.status === EStatusUser.ACTIVE) {
            return {
                data: user,
            };
        }

        const updatedUser = await this.userService.update(user.id, {
            status: EStatusUser.ACTIVE,
        });
        return {
            data: updatedUser,
        };
    }

    async verifyPassword(plainTextPassword: string, hashedPassword: string): Promise<boolean> {
        try {
            return await argon2.verify(hashedPassword, plainTextPassword);
        } catch (err) {
            return false;
        }
    }

    async checkLoginStatus(@Req() req: RequestWithUser): Promise<AppResponse<boolean>> {
        return {
            data: req.user ? true : false,
        };
    }

    async updatePassword({ newPassword, oldPassword }: UpdatePasswordDto, user: User): Promise<AppResponse<User>> {
        if (user.password === oldPassword) {
            throw new BadRequestException('auths.old and new passwords must be different');
        }
        const hashedNewPassword = await argon2.hash(newPassword);
        const updatedUser = await this.userService.update(user.id, {
            password: hashedNewPassword,
        });
        return {
            data: updatedUser,
        };
    }

    async logout(@Req() request: Request): Promise<ResponseMessage> {
        return new Promise((resolve, reject) => {
            request.session.destroy((err) => {
                if (err) {
                    console.log(err);
                    return reject(err);
                }
                resolve({ message: 'Logout' });
            });
        });
    }
}
