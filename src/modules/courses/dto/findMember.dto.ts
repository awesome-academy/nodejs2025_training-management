import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class FindMemberOfCourseDto extends PaginationDto {
    @ApiProperty({
        required: true,
    })
    @IsNotEmpty()
    @IsUUID('4')
    courseId: string;
}
