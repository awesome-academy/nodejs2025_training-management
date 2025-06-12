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
import { EntityManager, ILike, Not, QueryRunner, UpdateResult } from 'typeorm';
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
import { AppResponse, FindAllResponse } from 'src/types/common.type';
import { UserCourse } from '@modules/user_course/entity/user_course.entity';
import { UserSubjectService } from '@modules/user_subject/user_subject.service';
import { UserTaskService } from '@modules/user_task/user_task.service';
import { FindCourseDto } from './dto/findCourse.dto';
import { plainToInstance } from 'class-transformer';
import { CourseWithoutCreatorDto } from './responseDto/courseResponse.dto';
import { TraineeDto, UpdateStatusTraineeDto } from './dto/trainee.dto';
import { EUserCourseStatus } from '@modules/user_course/enum/index.enum';
import { parseDateString } from 'src/helper/date.helper';
import { FindMemberOfCourseDto } from './dto/findMember.dto';
import { UserCourseResponse } from '@modules/user_course/dto/UserCourseResponse.dto';
import { ECourseStatus } from './enum/index.enum';
import { DeleteTraineeDto } from './dto/deleteTrainee.dto';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';
import { QueueService } from '@modules/queue/queue.service';
import { ENotificationTraineeEnum, ENotificationType, EQueueName } from '@modules/queue/enum/index.enum';

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
        @Inject(forwardRef(() => QueueService))
        private readonly queueService: QueueService,
    ) {
        super(courseRepository);
    }

    async createNewCourse(dto: CreateCourseDto, user: User): Promise<Promise<AppResponse<CourseWithoutCreatorDto>>> {
        const { startDate, endDate, subjectIds, ...data } = dto;
        const course = await this.courseRepository.findOneByCondition({
            name: data.name,
        });
        if (course) {
            throw new UnprocessableEntityException('courses.Course is existed');
        }
        this._checkStartDateIsBeforeEndDate(startDate, endDate);
        if (subjectIds.length < 1) {
            throw new UnprocessableEntityException('courses.At least one subject is required');
        }
        const transaction: QueryRunner = await this.courseRepository.startTransaction();
        try {
            const newCourse = await this.courseRepository.create(
                {
                    ...data,
                    startDate: parseDateString(startDate),
                    endDate: parseDateString(endDate),
                    creator: user,
                },
                undefined,
                transaction.manager,
            );
            await this.supervisorCourseService.create(
                {
                    course: newCourse,
                    user: user,
                },
                transaction.manager,
            );
            await this.addSubjectForCourse({ subjectIds: subjectIds }, user, newCourse.id, transaction.manager);
            await transaction.commitTransaction();
            return {
                data: plainToInstance(CourseWithoutCreatorDto, newCourse),
            };
        } catch (error) {
            await transaction.rollbackTransaction();
            throw new UnprocessableEntityException('courses.Error happens when creating new course');
        } finally {
            await transaction.release();
        }
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

    async getAllTraineeCourseForCourse(
        dto: FindMemberOfCourseDto,
        user: User,
    ): Promise<AppResponse<FindAllResponse<UserCourseResponse>>> {
        const { page, pageSize, search, courseId, status } = dto;
        const course = await this.courseRepository.findOneByCondition({
            id: courseId,
            supervisorCourses: { user: { id: user.id } },
        });
        if (!course) {
            throw new ForbiddenException('Forbidden Resource');
        }
        const { limit, skip } = getLimitAndSkipHelper(page, pageSize);

        const condition: any = {
            course: {
                id: courseId,
            },
        };

        if (search) {
            condition.user = {
                name: ILike(`%${search}%`),
            };
        }

        if (status) {
            condition.status = status;
        }

        const result = await this.userCourseService.findAll(condition, {
            skip,
            take: limit,
            relations: ['user'],
        });

        const formattedItems: UserCourseResponse[] = result.items.map((item) =>
            plainToInstance(UserCourseResponse, item),
        );

        return {
            data: {
                count: result.count,
                items: formattedItems,
            },
        };
    }

    async exportUsers(dto: FindMemberOfCourseDto, user: User, res: Response) {
        const { search, courseId, status } = dto;
        const workbook = new ExcelJS.Workbook();

        const course = await this.courseRepository.findOneByCondition({
            id: courseId,
            supervisorCourses: { user: { id: user.id } },
        });

        if (!course) {
            throw new ForbiddenException('Forbidden Resource');
        }

        const worksheet = workbook.addWorksheet(`List Trainees of ${course.name} Course`);

        const condition: any = {
            course: {
                id: courseId,
            },
        };

        if (search) {
            condition.user = {
                name: ILike(`%${search}%`),
            };
        }

        if (status) {
            condition.status = status;
        }

        const result = await this.userCourseService.findAll(condition, {
            relations: ['user'],
        });

        worksheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Name', key: 'name', width: 80 },
            { header: 'Email', key: 'email', width: 80 },
            { header: 'Progress', key: 'progress', width: 10 },
            { header: 'Status', key: 'status', width: 30 },
        ];

        worksheet.addRows(
            result.items.map((userCourse, index) => {
                return {
                    id: index,
                    name: userCourse.user.name,
                    email: userCourse.user.email,
                    progress: userCourse.courseProgress,
                    status: userCourse.status,
                };
            }),
        );

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=users.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    }

    async addTraineeForCourse(email: string, courseId: string): Promise<UserCourse> {
        const trainee = await this.userService.findOneByCondition({
            email: email,
            role: ERolesUser.TRAINEE,
        });
        if (!trainee) {
            throw new NotFoundException("courses.Please enter correct the trainee's email");
        }
        const checkTraineeHadJoinedCourse = await this.userCourseService.findOneByCondition({
            course: {
                id: courseId,
            },
            user: {
                id: trainee.id,
            },
        });
        if (checkTraineeHadJoinedCourse) {
            throw new UnprocessableEntityException('The trainee has already joined this course.');
        }
        const courseDetail = await this._getCourseDetail(courseId);
        const courseSubjectsDetail = await this._getSubjectsAndTaskListFromCourseDetail(courseDetail);
        for (let i = 0; i < courseSubjectsDetail.length; i++) {
            const courseSubject = courseSubjectsDetail[i];
            const userSubject = await this.userSubjectService.addTraineeForUserSubject(
                courseSubject.courseSubjectId,
                trainee,
            );
            await this.userTaskService.handleCreateUserTask(userSubject, courseSubject.tasks);
        }
        const userCourse = await this.userCourseService.handleAddTraineeForCourse(trainee, courseId);
        await this.queueService.addVerifyJob({
            queueName: EQueueName.Notification,
            notificationType: ENotificationType.TraineeAddOrRemove,
            type: ENotificationTraineeEnum.ADD,
            email: email,
            courseName: courseDetail.name,
        });
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

    async supervisorFindCourse(dto: FindCourseDto, user: User): Promise<AppResponse<FindAllResponse<Course>>> {
        const { name, creatorName, page, pageSize } = dto;
        const { limit, skip } = getLimitAndSkipHelper(page, pageSize);

        const queryBuilder = this.courseRepository
            .createQueryBuilder('course')
            .innerJoinAndSelect('course.supervisorCourses', 'supervisorCourses')
            .innerJoinAndSelect('course.creator', 'creator')
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

        const [items, count] = await queryBuilder.getManyAndCount();

        return {
            data: {
                items,
                count,
            },
        };
    }

    async getCourseForTrainee(dto: FindCourseDto, user: User): Promise<AppResponse<CourseWithoutCreatorDto[]>> {
        const { name, creatorName, page, pageSize } = dto;
        const { limit, skip } = getLimitAndSkipHelper(page, pageSize);

        const queryBuilder = this.courseRepository
            .createQueryBuilder('course')
            .innerJoinAndSelect('course.userCourses', 'userCourses')
            .innerJoinAndSelect('course.creator', 'creator')
            .where('userCourses.userId = :userId', { userId: user.id })
            .andWhere('course.status = :courseStatus', { courseStatus: ECourseStatus.ACTIVE })
            .andWhere('userCourses.status != :status', { status: EUserCourseStatus.INACTIVE });

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

    async getCourseDetailForTrainee(courseId: string, user: User): Promise<AppResponse<Course>> {
        await this._checkCourseExistsAndActive(courseId);
        const userIsTraineeOfCourse = await this.userCourseService.findOneByCondition({
            user: { id: user.id },
            course: { id: courseId },
            status: Not(EUserCourseStatus.INACTIVE),
        });
        if (!userIsTraineeOfCourse) {
            throw new ForbiddenException('auths.Forbidden Resource');
        } else {
            return {
                data: await this._getCourseDetailForTrainee(courseId, user),
            };
        }
    }

    private async _getCourseDetailForTrainee(courseId: string, user: User) {
        const course = await this.courseRepository
            .createQueryBuilder('course')
            .leftJoinAndSelect('course.courseSubjects', 'courseSubject')
            .leftJoinAndSelect('courseSubject.subject', 'subject')
            .leftJoinAndSelect(
                'courseSubject.userSubjects',
                'userSubject',
                'userSubject.userId = :userId AND userSubject.courseSubjectId = courseSubject.id',
                { userId: user.id },
            )
            .leftJoinAndSelect('userSubject.userTasks', 'userTask')
            .leftJoinAndSelect('userTask.task', 'task', 'userTask.userSubjectId = userSubject.id')
            .where('course.id = :courseId', { courseId })
            .getOne();

        if (!course) {
            throw new NotFoundException('courses.Course not found');
        }

        return course;
    }

    async getMembersNameOfCourseForTrainee(courseId: string, user: User): Promise<AppResponse<string[]>> {
        await this._checkCourseExists(courseId);
        const userIsTraineeOfCourse = await this.userCourseService.findOneByCondition({
            user: { id: user.id },
            course: { id: courseId },
        });
        if (!userIsTraineeOfCourse) {
            throw new ForbiddenException('auths.Forbidden Resource');
        }
        const memberOfCourse = (
            await this.userCourseService.findAll(
                {
                    course: { id: courseId },
                },
                {
                    relations: ['user'],
                },
            )
        ).items.map((userCourse) => userCourse.user.name);
        return {
            data: memberOfCourse,
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

    async getCourseDetailForSupervisor(courseId: string, user: User): Promise<AppResponse<Course>> {
        const userIsSupervisorOfCourse = await this.supervisorCourseService.findOneByCondition({
            course: {
                id: courseId,
            },
            user: {
                id: user.id,
            },
        });
        if (userIsSupervisorOfCourse) {
            return {
                data: await this._getCourseDetail(courseId),
            };
        } else {
            throw new ForbiddenException('auths.Forbidden Resource');
        }
    }

    async updateCourseInfo(dto: UpdateCourseDto, user: User, id: string): Promise<AppResponse<UpdateResult>> {
        const checkCourseIdStudyByTrainee = await this._checkCourseIsStudyByTrainee(id);
        if (checkCourseIdStudyByTrainee) {
            throw new UnprocessableEntityException('courses.Can not adjust this course');
        }
        await this._checkUserIsSupervisorOfCourse(id, user);
        return {
            data: await this.courseRepository.update(id, dto),
        };
    }

    async addSubjectForCourse(
        dto: UpdateSubjectForCourseDto,
        user: User,
        id: string,
        manager?: EntityManager,
    ): Promise<AppResponse<CourseSubject[]>> {
        const checkCourseIdStudyByTrainee = await this._checkCourseIsStudyByTrainee(id, manager);
        if (checkCourseIdStudyByTrainee) {
            throw new UnprocessableEntityException('courses.Can not adjust this course');
        }
        const { subjectIds } = dto;
        await this._checkUserIsSupervisorOfCourse(id, user, manager);
        return {
            data: await this.courseSubjectService.addSubjectCourse(id, subjectIds, manager),
        };
    }

    async deleteCourse(id: string, user: User): Promise<AppResponse<UpdateResult>> {
        const checkCourseIdStudyByTrainee = await this._checkCourseIsStudyByTrainee(id);
        if (checkCourseIdStudyByTrainee) {
            throw new UnprocessableEntityException('courses.Can not adjust this course');
        }
        await this._checkUserIsSupervisorOfCourse(id, user);
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
        await this._checkUserIsSupervisorOfCourse(id, user);
        await this.courseSubjectService.deleteByCourseAndSubjectId(id, subjectId);
        return {
            data: await this.courseRepository.softDelete(id),
        };
    }

    async deleteTraineeOfCourse(
        courseId: string,
        { userCourseId }: DeleteTraineeDto,
        user: User,
    ): Promise<AppResponse<boolean>> {
        await this._checkUserIsSupervisorOfCourse(courseId, user);
        const userCourse = await this.userCourseService.findOneByCondition(
            {
                id: userCourseId,
            },
            {
                relations: ['user', 'course'],
            },
        );
        if (!userCourse) {
            throw new NotFoundException('courses.Trainee Not Found');
        }
        const status: boolean = await await this.userCourseService.remove(userCourseId);
        await this.queueService.addVerifyJob({
            queueName: EQueueName.Notification,
            notificationType: ENotificationType.TraineeAddOrRemove,
            type: ENotificationTraineeEnum.ADD,
            email: userCourse.user.email,
            courseName: userCourse.course.name,
        });
        return {
            data: status,
        };
    }

    private async _checkUserIsSupervisorOfCourse(courseId: string, user: User, manager?: EntityManager): Promise<void> {
        const supervisorCourse = await this.supervisorCourseService.findOneByCondition(
            {
                course: { id: courseId },
                user: { id: user.id },
            },
            undefined,
            manager,
        );
        if (!supervisorCourse) {
            throw new ForbiddenException('Forbidden Resource');
        }
    }

    async addSupervisor({ email }: EmailDto, courseId: string, user: User): Promise<AppResponse<SupervisorCourse>> {
        await this._checkUserIsSupervisorOfCourse(courseId, user);
        const newSupervisor = await this.userService.findByEmail(email);
        if (!newSupervisor || newSupervisor.role !== ERolesUser.SUPERVISOR) {
            throw new UnprocessableEntityException("courses.The supervisor's email is not valid");
        }
        const checkSupervisorIsExsisted = await this.supervisorCourseService.findOneByCondition({
            course: {
                id: courseId,
            },
            user: {
                id: newSupervisor.id,
            },
        });
        if (checkSupervisorIsExsisted) {
            throw new UnprocessableEntityException('courses.Supervisor is exsisted');
        }
        return {
            data: await this.supervisorCourseService.create({
                course: { id: courseId },
                user: { id: newSupervisor.id },
            }),
        };
    }

    private async _checkCourseIsStudyByTrainee(courseId: string, manager?: EntityManager): Promise<boolean> {
        await this._checkCourseExists(courseId, manager);

        const course = await this.courseRepository.findOneByCondition(
            {
                id: courseId,
                userCourses: {
                    status: EUserCourseStatus.IN_PROGRESS,
                },
            },
            { relations: ['userCourses'] },
            manager,
        );

        if (!course || course.userCourses.length === 0) return false;

        return true;
    }

    private async _checkCourseExists(courseId: string, manager?: EntityManager): Promise<void> {
        const course = await this.courseRepository.findOneById(courseId, undefined, manager);
        if (!course) {
            throw new NotFoundException('courses.Course not found');
        }
    }

    private async _checkCourseExistsAndActive(courseId: string): Promise<void> {
        const course = await this.courseRepository.findOneByCondition({
            id: courseId,
            status: ECourseStatus.ACTIVE,
        });
        if (!course) {
            throw new NotFoundException('courses.Course not found');
        }
    }

    private _checkStartDateIsBeforeEndDate(startDate: string, endDate: string) {
        const start = parseDateString(startDate);
        const end = parseDateString(endDate);

        if (end.getTime() <= start.getTime()) {
            throw new UnprocessableEntityException('Start date must be before end date.');
        }
    }
}
