import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsEnum, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ECourseStatus } from '../enum/index.enum';
import { IsDateFormatDDMMYYYY } from 'src/validators/date.validator';
import { Type } from 'class-transformer';
import { IsAfterNow } from 'src/validators/isAfterNow.validator';

export class CreateCourseDto {
    @ApiProperty({
        required: true,
    })
    @IsNotEmpty()
    name: string;

    @ApiProperty({
        required: true,
        enum: ECourseStatus,
        default: ECourseStatus.DISABLED,
    })
    @IsEnum(ECourseStatus)
    @IsOptional()
    status?: ECourseStatus;

    @ApiProperty({
        required: true,
    })
    @IsNotEmpty()
    description: string;

    @ApiProperty({
        required: true,
    })
    @IsNotEmpty()
    @IsDateFormatDDMMYYYY({ message: 'Date must be in format dd/mm/yyyy' })
    @IsAfterNow()
    startDate: string;

    @ApiProperty({
        required: true,
    })
    @IsNotEmpty()
    @IsDateFormatDDMMYYYY({ message: 'Date must be in format dd/mm/yyyy' })
    @IsAfterNow()
    endDate: string;

    @ApiProperty({
        required: true,
        type: [String],
        description: 'List of subject UUID v4 strings',
    })
    @IsArray()
    @ArrayNotEmpty()
    @IsUUID('4', { each: true })
    @Type(() => String)
    subjectIds: string[];
}
