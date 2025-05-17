import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsNumber } from 'class-validator';

export class SendCodeDto {
    @ApiProperty({
        required: true,
    })
    @IsEmail()
    @IsNotEmpty()
    email: string;
}

export class VerifyCodeDto extends SendCodeDto {
    @ApiProperty({
        required: true,
    })
    @Type(() => Number)
    @IsNumber()
    code: number;
}
