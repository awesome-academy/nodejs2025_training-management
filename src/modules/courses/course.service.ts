import {
    ForbiddenException,
    forwardRef,
    Inject,
    Injectable,
    NotFoundException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { BaseServiceAbstract } from 'src/services/base/base.abstract.service';
import { Course } from './entity/course.entity';
import { CourseRepository } from '@repositories/course.repository';
import { CreateCourseDto } from './dto/createCourse.dto';
import { User } from '@modules/users/entity/user.entity';
import { SupervisorCourseService } from '@modules/supervisor_course/supervisor_course.service';
import { UpdateCourseDto } from './dto/updateCourse.dto';
import { UpdateResult } from 'typeorm';
import { CourseSubjectService } from '@modules/course_subject/course_subject.service';
import { UpdateSubjectForCourseDto } from './dto/UpdateSubjectForTask.dto';
import { CourseSubject } from '@modules/course_subject/entity/course_subject.entity';
import { DeleteSubjectCourseDto } from './dto/deleteSubject.dto';
import { EmailDto } from 'src/common/dto/email.dto';
import { UsersService } from '@modules/users/user.services';
import { ERolesUser } from '@modules/users/enums/index.enum';
import { AppResponse } from 'src/types/common.type';
import { SupervisorCourse } from '@modules/supervisor_course/entity/supervisor_course.entity';
import { getLimitAndSkipHelper } from 'src/helper/pagination.helper';
import { FindCourseDto } from './dto/findCourse.dto';
import { plainToInstance } from 'class-transformer';
import { CourseWithoutCreatorDto } from './responseDto/courseResponse.dto';

@Injectable()
export class CourseService extends BaseServiceAbstract<Course> {
    constructor(
        @Inject('COURSE_REPOSITORY')
        private readonly courseRepository: CourseRepository,
        @Inject(forwardRef(() => SupervisorCourseService))
        private readonly supervisorCourseService: SupervisorCourseService,
        private readonly courseSubjectService: CourseSubjectService,
        private readonly userService: UsersService,
    ) {
        super(courseRepository);
    }

    async createNewCourse(dto: CreateCourseDto, user: User): Promise<Promise<AppResponse<CourseWithoutCreatorDto>>> {
        const { startDate, endDate, ...data } = dto;
        const course = await this.courseRepository.findOneByCondition({
            name: data.name,
        });
        if (course) {
            throw new UnprocessableEntityException('courses.Course is existed');
        }
        const newCourse = await this.courseRepository.create({
            ...data,
            startDate: this._parseDateString(startDate),
            endDate: this._parseDateString(endDate),
            creator: user,
        });
        await this.supervisorCourseService.create({
            course: newCourse,
            user: user,
        });
        return {
            data: plainToInstance(CourseWithoutCreatorDto, newCourse),
        };
    }

    async supervisorFindCourse(dto: FindCourseDto, user: User): Promise<Course[]> {
        const { name, creatorName, page, pageSize } = dto;
        const { limit, skip } = getLimitAndSkipHelper(page, pageSize);

        const queryBuilder = this.courseRepository
            .createQueryBuilder('course')
            .innerJoinAndSelect('course.supervisorCourses', 'supervisorCourses')
            .where('supervisorCourses.userId = :userId', { userId: user.id });

        if (name) {
            queryBuilder.andWhere('course.name ILIKE :name', {
                name: `%${name}%`,
            });
        }

        if (creatorName) {
            queryBuilder.andWhere('creator.name ILIKE :creatorName', {
                creatorName: `%${creatorName}%`,
            });
        }

        queryBuilder.skip(skip).take(limit);

        return await queryBuilder.getMany();
    }

    async _getCourseDetail(courseId: string): Promise<Course> {
        const course = await this.courseRepository
            .createQueryBuilder('course')
            .leftJoinAndSelect('course.courseSubjects', 'courseSubject')
            .leftJoinAndSelect('courseSubject.subject', 'subject')
            .leftJoinAndSelect('subject.tasksCreated', 'task')
            .where('course.id = :courseId', { courseId })
            .getOne();

        if (!course) {
            throw new NotFoundException('Course not found');
        }

        return course;
    }

    async getCourseDetailForSupervisor(courseId: string, user: User): Promise<Course> {
        const userIsSupervisorOfCourse = await this.supervisorCourseService.findOneByCondition({
            course: {
                id: courseId,
            },
            user: {
                id: user.id,
            },
        });
        if (userIsSupervisorOfCourse) {
            return await this._getCourseDetail(courseId);
        } else {
            throw new ForbiddenException('auths.Forbidden Resource');
        }
    }

    async updateCourseInfo(dto: UpdateCourseDto, user: User, id: string): Promise<AppResponse<UpdateResult>> {
        const checkCourseIdStudyByTrainee = await this._checkCourseIsStudyByTrainee(id);
        if (checkCourseIdStudyByTrainee) {
            throw new UnprocessableEntityException('courses.Can not adjust this course');
        }
        await this._checkUserPermissionForCourse(id, user);
        return {
            data: await this.courseRepository.update(id, dto),
        };
    }

    async addSubjectForCourse(
        dto: UpdateSubjectForCourseDto,
        user: User,
        id: string,
    ): Promise<AppResponse<CourseSubject[]>> {
        const checkCourseIdStudyByTrainee = await this._checkCourseIsStudyByTrainee(id);
        if (checkCourseIdStudyByTrainee) {
            throw new UnprocessableEntityException('courses.Can not adjust this course');
        }
        const { subjectIds } = dto;
        await this._checkUserPermissionForCourse(id, user);
        return {
            data: await this.courseSubjectService.addSubjectCourse(id, subjectIds),
        };
    }

    async deleteCourse(id: string, user: User): Promise<AppResponse<UpdateResult>> {
        const checkCourseIdStudyByTrainee = await this._checkCourseIsStudyByTrainee(id);
        if (checkCourseIdStudyByTrainee) {
            throw new UnprocessableEntityException('courses.Can not adjust this course');
        }
        await this._checkUserPermissionForCourse(id, user);
        await this.courseSubjectService.deleteByCourseId(id);
        return {
            data: await this.courseRepository.softDelete(id),
        };
    }

    async deleteSubjectForCourse(
        id: string,
        { subjectId }: DeleteSubjectCourseDto,
        user: User,
    ): Promise<AppResponse<UpdateResult>> {
        const checkCourseIdStudyByTrainee = await this._checkCourseIsStudyByTrainee(id);
        if (checkCourseIdStudyByTrainee) {
            throw new UnprocessableEntityException('courses.Can not adjust this course');
        }
        await this._checkUserPermissionForCourse(id, user);
        await this.courseSubjectService.deleteByCourseAndSubjectId(id, subjectId);
        return {
            data: await this.courseRepository.softDelete(id),
        };
    }

    async _checkUserPermissionForCourse(courseId: string, user: User): Promise<void> {
        const course = await this.courseRepository.findOneByCondition(
            {
                id: courseId,
            },
            {
                relations: ['creator'],
            },
        );
        if (!course) {
            throw new NotFoundException('course.Course not found');
        }
        if (user.id !== course.creator.id) {
            throw new ForbiddenException('Unauthorized');
        }
    }

    async addSupervisor({ email }: EmailDto, courseId: string, user: User): Promise<AppResponse<SupervisorCourse>> {
        const checkUserHasPermission = await this.supervisorCourseService.findOneByCondition({
            user: { id: user.id },
            course: { id: courseId },
        });
        if (!checkUserHasPermission) {
            throw new ForbiddenException("You don't have permission to do this");
        }
        const newSupervisor = await this.userService.findByEmail(email);
        if (!newSupervisor || newSupervisor.role !== ERolesUser.SUPERVISOR) {
            throw new UnprocessableEntityException("The supervisor's email is not valid");
        }
        return {
            data: await this.supervisorCourseService.create({
                course: { id: courseId },
                user: { id: user.id },
            }),
        };
    }

    async _checkCourseIsStudyByTrainee(courseId: string): Promise<boolean> {
        const course = await this.courseRepository.findOneByCondition({ id: courseId }, { relations: ['userCourses'] });

        if (!course) {
            throw new NotFoundException(`Course with id ${courseId} not found`);
        }

        return course.userCourses.length > 0;
    }

    _parseDateString(dateStr: string): Date {
        const [day, month, year] = dateStr.split('/').map(Number);
        return new Date(year, month - 1, day);
    }
}
