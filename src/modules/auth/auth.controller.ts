import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SignUpDto } from './dto/auth.dto';
import { AuthService } from './auth.service';
import { AppResponse } from 'src/types/common.type';
import { User } from '@modules/users/entity/user.entity';
import { LocalAuthGuard } from './guards/local.guard';
import { RequestWithUser } from 'src/types/requests.type';
import { SendCodeDto, VerifyCodeDto } from './dto/verify.dto';

@Controller('auth')
@ApiTags('auths')
export class AuthController {
    constructor(private readonly authService: AuthService) {}
    @UseGuards(LocalAuthGuard)
    @Post('login')
    async handleLogin(@Request() req: RequestWithUser): Promise<AppResponse<User>> {
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
}
