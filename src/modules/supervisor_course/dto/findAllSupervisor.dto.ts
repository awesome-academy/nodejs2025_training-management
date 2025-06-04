import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class FindAllSupervisorOfCourseDto extends PaginationDto {
    @ApiProperty({
        required: true,
    })
    @IsUUID('4')
    courseId: string;
}
