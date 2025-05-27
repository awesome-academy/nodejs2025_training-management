import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    DeleteDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
} from 'typeorm';
import { ECourseStatus } from '../enum/index.enum';
import { BaseEntity } from '@modules/shared/base/base.entity';
import { User } from '@modules/users/entity/user.entity';
import { CourseSubject } from '@modules/course_subject/entity/course_subject.entity';
import { UserCourse } from '@modules/user_course/entity/user_course.entity';
import { SupervisorCourse } from '@modules/supervisor_course/entity/supervisor_course.entity';
import { DEFAULT_COURSE_THUMBNAIL, NAME_LENGTH } from 'src/constants/contants';

@Entity()
export class Course extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: NAME_LENGTH })
    name: string;

    @Column({
        type: 'enum',
        enum: ECourseStatus,
        default: ECourseStatus.ACTIVE,
    })
    status: ECourseStatus;

    @Column('text')
    description: string;

    @Column({ type: 'date' })
    startDate: Date;

    @Column({ type: 'date' })
    endDate: Date;

    @Column({ type: 'varchar', default: DEFAULT_COURSE_THUMBNAIL })
    image: string;

    @ManyToOne(() => User, (user) => user.coursesCreated)
    @JoinColumn({ name: 'creatorId' })
    creator: User;

    @OneToMany(() => CourseSubject, (courseSubject) => courseSubject.course)
    courseSubjects: CourseSubject[];

    @OneToMany(() => UserCourse, (userCourse) => userCourse.course)
    userCourses: UserCourse[];

    @OneToMany(() => SupervisorCourse, (supervisorCourse) => supervisorCourse.course)
    supervisorCourses: SupervisorCourse[];

    @CreateDateColumn()
    createdAt: Date;

    @DeleteDateColumn()
    deletedAt: Date | null;
}
