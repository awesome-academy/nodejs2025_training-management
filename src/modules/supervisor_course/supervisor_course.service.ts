import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { BaseServiceAbstract } from 'src/services/base/base.abstract.service';
import { SupervisorCourse } from './entity/supervisor_course.entity';
import { SupervisorCourseRepository } from '@repositories/supervisor_course.repository';
import { FindAllSupervisorOfCourseDto } from './dto/findAllSupervisor.dto';
import { getLimitAndSkipHelper } from 'src/helper/pagination.helper';
import { ILike } from 'typeorm';
import { User } from '@modules/users/entity/user.entity';
import { plainToInstance } from 'class-transformer';
import { SupervisorCourseResponseDto } from './dto/SupervisorCourseResponse.dto';
import { AppResponse, FindAllResponse } from 'src/types/common.type';

@Injectable()
export class SupervisorCourseService extends BaseServiceAbstract<SupervisorCourse> {
    constructor(
        @Inject('SUPERVISOR_COURSE_REPOSITORY')
        private readonly supervisorCourseRepository: SupervisorCourseRepository,
    ) {
        super(supervisorCourseRepository);
    }

    async getAllSupervisorOfCourse(
        dto: FindAllSupervisorOfCourseDto,
        user: User,
    ): Promise<AppResponse<FindAllResponse<SupervisorCourseResponseDto>>> {
        const { page, pageSize, search, courseId } = dto;
        const { skip, limit } = getLimitAndSkipHelper(page, pageSize);
        const checkUserIsSupervisorOfCourse = await this.supervisorCourseRepository.findOneByCondition({
            course: {
                id: courseId,
            },
            user: {
                id: user.id,
            },
        });
        if (!checkUserIsSupervisorOfCourse) {
            throw new ForbiddenException('Forbidden Resource');
        }
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
        const result = await this.supervisorCourseRepository.findAll(condition, {
            skip,
            take: limit,
            relations: ['course', 'user', 'course.creator'],
        });

        const formattedResult = result.items.map((supervisorCourse) =>
            plainToInstance(SupervisorCourseResponseDto, supervisorCourse),
        );

        return {
            data: {
                count: result.count,
                items: formattedResult,
            },
        };
    }
}
