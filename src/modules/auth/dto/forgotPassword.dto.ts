import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsStrongPassword, Matches } from 'class-validator';
import { EEnvironment } from '../enum/index.enum';

export class ForgotPasswordDto {
    @ApiProperty({
        required: true,
        description: 'The email of user',
    })
    @IsEmail()
    email: string;

    @ApiProperty({
        required: true,
        description: 'code',
    })
    @Matches(/^\d+$/, { message: 'auths.Code must contain digits only' })
    code: string;

    @ApiProperty({
        required: true,
        description: 'code',
    })
    @IsNotEmpty()
    @IsStrongPassword()
    password: string;

    @ApiProperty({
        required: true,
        description: 'code',
        enum: EEnvironment,
    })
    @IsEnum(EEnvironment)
    environment: EEnvironment;
}
