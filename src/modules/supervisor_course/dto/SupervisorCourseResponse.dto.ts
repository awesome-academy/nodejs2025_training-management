import { CourseWithoutCreatorDto } from '@modules/courses/responseDto/courseResponse.dto';
import { UserResponseDto } from '@modules/users/dto/userResponse.dto';
import { Exclude, Expose, Type } from 'class-transformer';

@Exclude()
export class SupervisorCourseResponseDto {
    @Expose()
    id: string;

    @Expose()
    @Type(() => UserResponseDto)
    user: UserResponseDto;

    @Expose()
    @Type(() => CourseWithoutCreatorDto)
    course: CourseWithoutCreatorDto;
}
