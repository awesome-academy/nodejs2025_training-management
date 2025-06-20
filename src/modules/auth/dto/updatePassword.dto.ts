import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsStrongPassword } from 'class-validator';

export class UpdatePasswordDto {
    @ApiProperty({
        required: true,
    })
    @IsNotEmpty()
    oldPassword: string;

    @ApiProperty({
        required: true,
    })
    @IsNotEmpty()
    @IsStrongPassword()
    newPassword: string;
}
