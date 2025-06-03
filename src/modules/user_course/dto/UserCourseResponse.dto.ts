import { UserResponseDto } from '@modules/users/dto/userResponse.dto';
import { Exclude, Expose, Type } from 'class-transformer';

@Exclude()
export class UserCourseResponse {
    @Expose()
    id: string;

    @Expose()
    status: string;

    @Expose()
    courseProgress: number;

    @Expose()
    enrollDate: string;

    @Expose()
    createdAt: string;

    @Expose()
    deletedAt: string | null;

    @Expose()
    @Type(() => UserResponseDto)
    user: UserResponseDto;
}
