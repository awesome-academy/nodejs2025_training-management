import { Task } from '@modules/tasks/entity/task.entity';
import { User } from '@modules/users/entity/user.entity';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class SubjectResponseDto {
    @Expose()
    id: string;

    @Expose()
    name: string;

    @Expose()
    description: string;

    @Expose()
    tasksCreated: Task[];

    @Exclude()
    creator: User;

    constructor(partial: Partial<SubjectResponseDto>) {
        Object.assign(this, partial);
    }
}
