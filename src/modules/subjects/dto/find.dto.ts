import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class FindSubjectDto extends PaginationDto {
    @ApiProperty({
        required: false,
    })
    @IsOptional()
    name?: string;
}
