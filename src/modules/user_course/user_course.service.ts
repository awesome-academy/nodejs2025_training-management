import { Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { BaseServiceAbstract } from 'src/services/base/base.abstract.service';
import { UserCourse } from './entity/user_course.entity';
import { UserCourseRepository } from '@repositories/user_course.repository';
import { User } from '@modules/users/entity/user.entity';
import { EUserCourseStatus } from './enum/index.enum';

@Injectable()
export class UserCourseService extends BaseServiceAbstract<UserCourse> {
    constructor(
        @Inject('USER_COURSE_REPOSITORY')
        private readonly userCourseRepository: UserCourseRepository,
    ) {
        super(userCourseRepository);
    }

    async handleAddTraineeForCourse(user: User, courseId: string): Promise<UserCourse> {
        const userCourses = await this.userCourseRepository.find(
            { user: { id: user.id }, status: EUserCourseStatus.IN_PROGRESS },
            { relations: ['course'] },
        );
        const courses = userCourses.map((uc) => uc.course);

        if (courses.length == 1) {
            if (courses[0].id === courseId) {
                throw new UnprocessableEntityException('courses.Trainee had joined this course');
            } else {
                throw new UnprocessableEntityException('courses.Trainee is learning another course');
            }
        }

        return await this.userCourseRepository.create({
            user: { id: user.id },
            course: { id: courseId },
            status: EUserCourseStatus.IN_PROGRESS,
            courseProgress: 0,
            enrollDate: new Date(),
        });
    }
}
