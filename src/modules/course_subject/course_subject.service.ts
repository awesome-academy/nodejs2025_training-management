import {
    ForbiddenException,
    forwardRef,
    Inject,
    Injectable,
    NotFoundException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { BaseServiceAbstract } from 'src/services/base/base.abstract.service';
import { CourseSubject } from './entity/course_subject.entity';
import { CourseSubjectRepository } from '@repositories/course_subject.repository';
import { CourseService } from '@modules/courses/course.service';
import { SubjectService } from '@modules/subjects/subjects.service';
import { EntityManager, UpdateResult } from 'typeorm';
import { UserSubjectService } from '@modules/user_subject/user_subject.service';
import { User } from '@modules/users/entity/user.entity';
import { AppResponse } from 'src/types/common.type';
import { ECourseSubjectStatus } from './enum/index.enum';
import { SupervisorCourseService } from '@modules/supervisor_course/supervisor_course.service';

@Injectable()
export class CourseSubjectService extends BaseServiceAbstract<CourseSubject> {
    constructor(
        @Inject('COURSE_SUBJECT_REPOSITORY')
        private readonly courseSubjectRepository: CourseSubjectRepository,
        @Inject(forwardRef(() => CourseService))
        private readonly courseService: CourseService,
        private readonly subjectService: SubjectService,
        private readonly userSubjectService: UserSubjectService,
        private readonly supervisorCourseService: SupervisorCourseService,
    ) {
        super(courseSubjectRepository);
    }

    async finishSubjectForCourse(courseSubjectId: string, user: User): Promise<AppResponse<UpdateResult>> {
        const courseSubject = await this.courseSubjectRepository.findOneByCondition(
            {
                id: courseSubjectId,
            },
            {
                relations: ['course', 'subject', 'userSubjects', 'userSubjects.user'],
            },
        );

        const checkIsSupervisorCourse = await this.supervisorCourseService.findOneByCondition({
            course: {
                id: courseSubject.course.id,
            },
            user: {
                id: user.id,
            },
        });

        if (!checkIsSupervisorCourse) {
            throw new ForbiddenException('Forbidden Resource');
        }

        const finishSubjectForTrainees = courseSubject.userSubjects.map((userSubject) =>
            this.userSubjectService.finishSubjectForTrainee(userSubject.id, userSubject.user),
        );

        try {
            await Promise.all(finishSubjectForTrainees);
            return {
                data: await this.courseSubjectRepository.update(courseSubjectId, {
                    status: ECourseSubjectStatus.FINISH,
                }),
            };
        } catch (error) {
            throw new UnprocessableEntityException('courses.Error when mark the subject of course is finish');
        }
    }

    async addSubjectCourse(courseId: string, subjectIds: string[], manager?: EntityManager): Promise<CourseSubject[]> {
        const courseSubjects = subjectIds.map((subjectId) => {
            return this.courseSubjectRepository.create(
                {
                    course: { id: courseId },
                    subject: { id: subjectId },
                },
                undefined,
                manager,
            );
        });
        try {
            return await Promise.all(courseSubjects);
        } catch (error) {
            throw new NotFoundException('Invalid data');
        }
    }

    async deleteByCourseId(courseId: string): Promise<UpdateResult> {
        return await this.courseSubjectRepository.softDeleteMany({
            course: {
                id: courseId,
            },
        });
    }

    async deleteByCourseAndSubjectId(courseId: string, subjectId: string): Promise<UpdateResult> {
        return await this.courseSubjectRepository.softDeleteMany({
            course: {
                id: courseId,
            },
            subject: {
                id: subjectId,
            },
        });
    }
}
