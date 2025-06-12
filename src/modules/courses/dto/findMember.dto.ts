import { EUserCourseStatus } from '@modules/user_course/enum/index.enum';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class FindMemberOfCourseDto extends PaginationDto {
    @ApiProperty({
        required: true,
    })
    @IsNotEmpty()
    @IsUUID('4')
    courseId: string;

    @ApiProperty({
        required: true,
    })
    @IsOptional()
    @IsEnum(EUserCourseStatus)
    status?: EUserCourseStatus;
}
