import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SignUpDto } from './dto/auth.dto';
import { AuthService } from './auth.service';
import { AppResponse, ResponseMessage } from 'src/types/common.type';
import { User } from '@modules/users/entity/user.entity';
import { LocalAuthGuard } from './guards/local.guard';
import { RequestWithUser } from 'src/types/requests.type';
import { SendCodeDto, VerifyCodeDto } from './dto/verify.dto';
import { Request } from 'express';

@Controller('auth')
@ApiTags('auths')
export class AuthController {
    constructor(private readonly authService: AuthService) {}
    @UseGuards(LocalAuthGuard)
    @Post('login')
    async handleLogin(@Req() req: RequestWithUser): Promise<AppResponse<User>> {
        return await this.authService.buildLoginResponse(req);
    }

    @Post('signUp')
    async handleSignUp(@Body() dto: SignUpDto): Promise<AppResponse<User>> {
        return await this.authService.signUp(dto);
    }

    @Post('verify')
    async verifyCode(@Body() dto: SendCodeDto): Promise<AppResponse<boolean>> {
        return await this.authService.handleSendCode(dto);
    }

    @Post('verifyCode')
    async confirmVerifyCode(@Body() dto: VerifyCodeDto): Promise<AppResponse<User>> {
        return await this.authService.verifyCode(dto);
    }

    @Get('status')
    async getAuthStatus(@Req() req: RequestWithUser): Promise<AppResponse<boolean>> {
        return await this.authService.checkLoginStatus(req);
    }

    @Get('logout')
    async logout(@Req() request: Request): Promise<ResponseMessage> {
        return await this.authService.logout(request);
    }
}
