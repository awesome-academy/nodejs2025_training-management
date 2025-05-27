import { EUserCourseStatus } from '@modules/user_course/enum/index.enum';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEmail, IsEnum, IsUUID } from 'class-validator';

export class TraineeDto {
    @ApiProperty({
        default: ['trainee@gmail.com'],
        required: true,
        isArray: true,
        type: String,
    })
    @IsArray()
    @IsEmail({}, { each: true })
    emails: string[];

    @ApiProperty({
        required: true,
    })
    @IsUUID('4')
    courseId: string;
}

export class UpdateStatusTraineeDto {
    @ApiProperty({
        required: true,
        enum: EUserCourseStatus,
    })
    @IsEnum(EUserCourseStatus)
    status: EUserCourseStatus;
}
