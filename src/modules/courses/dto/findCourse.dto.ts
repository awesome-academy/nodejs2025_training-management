import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class FindCourseDto extends PaginationDto {
    @ApiProperty({
        required: false,
    })
    @IsOptional()
    name?: string;

    @ApiProperty({
        required: false,
    })
    @IsOptional()
    creatorName?: string;
}
