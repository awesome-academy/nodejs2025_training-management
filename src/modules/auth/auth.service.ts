import { UsersService } from '@modules/users/user.services';
import {
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
import { VerifyService } from '@modules/queue/verify.service';
import { RequestWithUser } from 'src/types/requests.type';
import { AppResponse } from 'src/types/common.type';

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UsersService,
        private readonly cacheService: CacheService,
        private readonly verifyService: VerifyService,
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

    async handleSendCode({ email }: SendCodeDto): Promise<AppResponse<boolean>> {
        const user = await this.userService.findByEmail(email);
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const redisKey = `${user.id}:code`;
        try {
            await this.cacheService.setCache(redisKey, code, 300);
            await this.verifyService.addVerifyJob({
                code,
                email: email.toLowerCase(),
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

        const updatedUser = await this.userService.updateUser(
            {
                status: EStatusUser.ACTIVE,
            },
            user,
        );
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
}
