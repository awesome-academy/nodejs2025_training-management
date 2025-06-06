import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    DeleteDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
    Index,
} from 'typeorm';
import { BaseEntity } from '@modules/shared/base/base.entity';
import { Subject } from '@modules/subjects/entity/subject.entity';
import { UserTask } from '@modules/user_task/entity/user_task.entity';
import { NAME_LENGTH, TITLE_LENGTH } from 'src/constants/contants';

@Entity()
@Index('unique_title_not_deleted', ['title'], { unique: true, where: `"deleted_at" IS NULL` })
export class Task extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: TITLE_LENGTH })
    title: string;

    @Column({ length: NAME_LENGTH })
    contentFileLink: string;

    @ManyToOne(() => Subject, (subject) => subject.tasksCreated)
    @JoinColumn({ name: 'subjectId' })
    subject: Subject;

    @OneToMany(() => UserTask, (userTask) => userTask.task)
    userTasks: UserTask[];

    @CreateDateColumn()
    createdAt: Date;

    @DeleteDateColumn({ name: 'deleted_at' })
    deletedAt: Date | null;
}
