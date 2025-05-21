import { Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { BaseServiceAbstract } from 'src/services/base/base.abstract.service';
import { UserCourse } from './entity/user_course.entity';
import { UserCourseRepository } from '@repositories/user_course.repository';
import { User } from '@modules/users/entity/user.entity';
import { ERolesUser } from '@modules/users/enums/index.enum';
import { EUserCourseStatus } from './enum/index.enum';

@Injectable()
export class UserCourseService extends BaseServiceAbstract<UserCourse> {
    constructor(
        @Inject('USER_COURSE_REPOSITORY')
        private readonly userCourseRepository: UserCourseRepository,
    ) {
        super(userCourseRepository);
    }

    async handleAddTraineeForCouse(user: User, courseId: string): Promise<UserCourse> {
        if (user.role !== ERolesUser.TRAINEE) {
            throw new UnprocessableEntityException("courses.Please enter correct the trainee's email");
        }
        console.log('Trainee', user);
        const userCourses = await this.userCourseRepository.find({ user: { id: user.id } }, { relations: ['course'] });
        console.log(userCourses);
        const courses = userCourses.map((uc) => uc.course);

        if (courses.length == 1) {
            if (courses[0].id === courseId) {
                throw new UnprocessableEntityException('course.Trainee had joined this course');
            } else {
                throw new UnprocessableEntityException('course.Trainee is learning another course');
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
