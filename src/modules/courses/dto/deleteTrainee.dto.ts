import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class DeleteTraineeDto {
    @ApiProperty({
        required: true,
    })
    @IsUUID('4')
    userCourseId: string;
}
