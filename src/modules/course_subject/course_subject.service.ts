import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { BaseServiceAbstract } from 'src/services/base/base.abstract.service';
import { CourseSubject } from './entity/course_subject.entity';
import { CourseSubjectRepository } from '@repositories/course_subject.repository';
import { CourseService } from '@modules/courses/course.service';
import { SubjectService } from '@modules/subjects/subjects.service';
import { EntityManager, UpdateResult } from 'typeorm';

@Injectable()
export class CourseSubjectService extends BaseServiceAbstract<CourseSubject> {
    constructor(
        @Inject('COURSE_SUBJECT_REPOSITORY')
        private readonly courseSubjectRepository: CourseSubjectRepository,
        @Inject(forwardRef(() => CourseService))
        private readonly courseService: CourseService,
        private readonly subjectService: SubjectService,
    ) {
        super(courseSubjectRepository);
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
