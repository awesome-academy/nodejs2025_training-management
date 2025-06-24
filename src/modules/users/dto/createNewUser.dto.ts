import { ApiProperty } from '@nestjs/swagger';
import { ERolesUser, EStatusUser } from '../enums/index.enum';
import { IsAlphanumeric, IsEmail, IsNotEmpty, IsOptional, IsStrongPassword } from 'class-validator';

export class CreateNewUserDto {
    @ApiProperty({
        required: true,
    })
    @IsNotEmpty()
    @IsAlphanumeric()
    name: string;

    @ApiProperty({
        required: true,
    })
    @IsStrongPassword()
    password: string;

    @ApiProperty({
        required: true,
    })
    @IsEmail()
    email: string;

    @ApiProperty({
        required: false,
        enum: ERolesUser,
    })
    @IsOptional()
    role?: ERolesUser;

    @ApiProperty({
        required: false,
        enum: EStatusUser,
    })
    @IsOptional()
    status?: EStatusUser;
}
