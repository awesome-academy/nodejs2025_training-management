import { User } from '@modules/users/entity/user.entity';
import { Exclude, Expose } from 'class-transformer';

export class CourseWithoutCreatorDto {
    @Expose()
    id: string;

    @Expose()
    name: string;

    @Expose()
    status: string;

    @Expose()
    description: string;

    @Expose()
    startDate: Date;

    @Expose()
    endDate: Date;

    @Expose()
    image: string;

    @Expose()
    createdAt: Date;

    @Expose()
    deletedAt: Date | null;

    @Exclude()
    creator: User;

    constructor(partial: Partial<CourseWithoutCreatorDto>) {
        Object.assign(this, partial);
    }
}
