import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { EStatusUser } from '../enums/index.enum';
import { UpdateUserDto } from './updateUser.dto';

export class UpdateTraineeDto extends UpdateUserDto {
    @ApiProperty({
        required: false,
    })
    @IsOptional()
    @IsEnum(EStatusUser)
    status?: EStatusUser;
}
