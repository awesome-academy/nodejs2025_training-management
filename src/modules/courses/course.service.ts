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
import { SupervisorCourse } from '@modules/supervisor_course/entity/supervisor_course.entity';
import { getLimitAndSkipHelper } from 'src/helper/pagination.helper';
import { UserCourseService } from '@modules/user_course/user_course.service';
import { AppResponse } from 'src/types/common.type';
import { UserCourse } from '@modules/user_course/entity/user_course.entity';
import { UserSubjectService } from '@modules/user_subject/user_subject.service';
import { UserTaskService } from '@modules/user_task/user_task.service';
import { FindCourseDto } from './dto/findCourse.dto';
import { plainToInstance } from 'class-transformer';
import { CourseWithoutCreatorDto } from './responseDto/courseResponse.dto';
import { TraineeDto, UpdateStatusTraineeDto } from './dto/trainee.dto';

@Injectable()
export class CourseService extends BaseServiceAbstract<Course> {
    constructor(
        @Inject('COURSE_REPOSITORY')
        private readonly courseRepository: CourseRepository,
        @Inject(forwardRef(() => SupervisorCourseService))
        private readonly supervisorCourseService: SupervisorCourseService,
        private readonly courseSubjectService: CourseSubjectService,
        private readonly userService: UsersService,
        private readonly userCourseService: UserCourseService,
        private readonly userSubjectService: UserSubjectService,
        private readonly userTaskService: UserTaskService,
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

    async addTraineesToCourse(dto: TraineeDto, user: User): Promise<AppResponse<UserCourse[]>> {
        const { emails, courseId } = dto;
        await this._checkUserIsSupervisorOfCourse(courseId, user);
        const addTraineeTasks = emails.map((email) => this.addTraineeForCourse(email, courseId));
        try {
            const userCourseList: UserCourse[] = await Promise.all(addTraineeTasks);
            return {
                data: userCourseList,
            };
        } catch (error) {
            throw new UnprocessableEntityException(
                'courses.An error occurred while inserting the trainee list into the course.',
            );
        }
    }

    async addTraineeForCourse(email: string, courseId: string): Promise<UserCourse> {
        const trainee = await this.userService.findOneByCondition({
            email: email,
            role: ERolesUser.TRAINEE,
        });
        if (!trainee) {
            throw new NotFoundException("courses.Please enter correct the trainee's email");
        }
        const courseDetail = await this._getCourseDetail(courseId);
        const courseSubjectsDetail = await this._getSubjectsAndTaskListFromCourseDetail(courseDetail);
        for (let i = 0; i < courseSubjectsDetail.length; i++) {
            const courseSubject = courseSubjectsDetail[0];
            const userSubject = await this.userSubjectService.addTraineeForUserSubject(
                courseSubject.courseSubjectId,
                trainee,
            );
            await this.userTaskService.handleCreateUserTask(userSubject, courseSubject.tasks);
        }
        const userCourse = await this.userCourseService.handleAddTraineeForCourse(trainee, courseId);
        return userCourse;
    }

    async updateTraineeStatus(
        userCourseId: string,
        user: User,
        dto: UpdateStatusTraineeDto,
    ): Promise<AppResponse<UserCourse>> {
        const userCourse = await this.userCourseService.findOneByCondition(
            { id: userCourseId },
            { relations: ['course'] },
        );
        await this._checkUserIsSupervisorOfCourse(userCourse.course.id, user);
        return {
            data: await this.userCourseService.update(userCourseId, dto),
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

    async getCourseForTrainee(dto: FindCourseDto, user: User): Promise<AppResponse<CourseWithoutCreatorDto[]>> {
        const { name, creatorName, page, pageSize } = dto;
        const { limit, skip } = getLimitAndSkipHelper(page, pageSize);

        const queryBuilder = this.courseRepository
            .createQueryBuilder('course')
            .innerJoinAndSelect('course.userCourses', 'userCourses')
            .innerJoinAndSelect('course.creator', 'creator')
            .where('userCourses.userId = :userId', { userId: user.id });

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

        return {
            data: plainToInstance(CourseWithoutCreatorDto, await queryBuilder.getMany()),
        };
    }

    private async _getCourseDetail(courseId: string): Promise<Course> {
        const course = await this.courseRepository
            .createQueryBuilder('course')
            .leftJoinAndSelect('course.courseSubjects', 'courseSubject')
            .leftJoinAndSelect('courseSubject.subject', 'subject')
            .leftJoinAndSelect('subject.tasksCreated', 'task')
            .where('course.id = :courseId', { courseId })
            .getOne();

        if (!course) {
            throw new NotFoundException('courses.Course not found');
        }

        return course;
    }

    private async _getSubjectsAndTaskListFromCourseDetail(courseDetail: Course) {
        const courseSubjects: CourseSubject[] = courseDetail.courseSubjects;
        return courseSubjects.map((courseSubject) => {
            const subject = courseSubject.subject;

            return {
                courseSubjectId: courseSubject.id,
                subjectId: subject.id,
                subjectName: subject.name,
                description: subject.description,
                tasks: subject.tasksCreated,
            };
        });
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

    private async _checkUserPermissionForCourse(courseId: string, user: User): Promise<void> {
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
            throw new ForbiddenException('Forbidden Resource');
        }
    }

    private async _checkUserIsSupervisorOfCourse(courseId: string, user: User): Promise<void> {
        const supervisorCourse = await this.supervisorCourseService.findOneByCondition({
            course: { id: courseId },
            user: { id: user.id },
        });
        if (!supervisorCourse) {
            throw new ForbiddenException('Forbidden Resource');
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
            throw new UnprocessableEntityException("courses.The supervisor's email is not valid");
        }
        return {
            data: await this.supervisorCourseService.create({
                course: { id: courseId },
                user: { id: user.id },
            }),
        };
    }

    private async _checkCourseIsStudyByTrainee(courseId: string): Promise<boolean> {
        const course = await this.courseRepository.findOneByCondition({ id: courseId }, { relations: ['userCourses'] });

        if (!course) {
            throw new NotFoundException('courses.Course not found');
        }

        return course.userCourses.length > 0;
    }

    private _parseDateString(dateStr: string): Date {
        const [day, month, year] = dateStr.split('/').map(Number);
        return new Date(year, month - 1, day);
    }
}
