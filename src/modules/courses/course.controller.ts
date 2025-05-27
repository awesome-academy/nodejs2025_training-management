import {
    Body,
    ClassSerializerInterceptor,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateCourseDto } from './dto/createCourse.dto';
import { AppResponse } from 'src/types/common.type';
import { CourseService } from './course.service';
import { Course } from './entity/course.entity';
import { CurrentUserDecorator } from 'src/decorators/current-user.decorator';
import { User } from '@modules/users/entity/user.entity';
import { UpdateCourseDto } from './dto/updateCourse.dto';
import { UpdateResult } from 'typeorm';
import { UpdateSubjectForCourseDto } from './dto/UpdateSubjectForTask.dto';
import { CourseSubject } from '@modules/course_subject/entity/course_subject.entity';
import { DeleteSubjectCourseDto } from './dto/deleteSubject.dto';
import { EmailDto } from 'src/common/dto/email.dto';
import { SupervisorCourse } from '@modules/supervisor_course/entity/supervisor_course.entity';
import { FindCourseDto } from './dto/findCourse.dto';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { SessionAuthGuard } from '@modules/auth/guards/session.guard';
import { ERolesUser } from '@modules/users/enums/index.enum';
import { Roles } from 'src/decorators/roles.decorator';
import { CourseWithoutCreatorDto } from './responseDto/courseResponse.dto';

@Controller('courses')
@ApiTags('courses')
export class CourseController {
    constructor(private readonly courseService: CourseService) {}

    @Roles(ERolesUser.SUPERVISOR)
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Get('supervisor')
    async getCourseBySupervisor(
        @Query() dto: FindCourseDto,
        @CurrentUserDecorator() user: User,
    ): Promise<AppResponse<Course[]>> {
        return {
            data: await this.courseService.supervisorFindCourse(dto, user),
        };
    }

    @Roles(ERolesUser.SUPERVISOR)
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Get('supervisor/:courseId')
    async getCourseDetailBySupervisor(
        @Param('courseId') courseId: string,
        @CurrentUserDecorator() user: User,
    ): Promise<AppResponse<Course>> {
        return {
            data: await this.courseService.getCourseDetailForSupervisor(courseId, user),
        };
    }

    @Roles(ERolesUser.SUPERVISOR)
    @UseGuards(SessionAuthGuard, RolesGuard)
    @UseInterceptors(ClassSerializerInterceptor)
    @Post()
    async createCourse(
        @Body() dto: CreateCourseDto,
        @CurrentUserDecorator() user: User,
    ): Promise<AppResponse<CourseWithoutCreatorDto>> {
        return await this.courseService.createNewCourse(dto, user);
    }

    @Roles(ERolesUser.SUPERVISOR)
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Patch('subject/:id')
    async updateSubjectCourse(
        @Body() dto: UpdateSubjectForCourseDto,
        @CurrentUserDecorator() user: User,
        @Param('id') id: string,
    ): Promise<AppResponse<CourseSubject[]>> {
        return await this.courseService.addSubjectForCourse(dto, user, id);
    }

    @Roles(ERolesUser.SUPERVISOR)
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Patch('info/:id')
    async updateCourse(
        @Body() dto: UpdateCourseDto,
        @CurrentUserDecorator() user: User,
        @Param('id') id: string,
    ): Promise<AppResponse<UpdateResult>> {
        return await this.courseService.updateCourseInfo(dto, user, id);
    }

    @Roles(ERolesUser.SUPERVISOR)
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Patch('supervisor/:id')
    async addNewSupervisor(
        @Body() dto: EmailDto,
        @CurrentUserDecorator() user: User,
        @Param('id') id: string,
    ): Promise<AppResponse<SupervisorCourse>> {
        return await this.courseService.addSupervisor(dto, id, user);
    }

    @Roles(ERolesUser.SUPERVISOR)
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Delete('sub/:id')
    async deleteSubjectCourse(
        @Param('id') id: string,
        @Body() dto: DeleteSubjectCourseDto,
        @CurrentUserDecorator() user: User,
    ): Promise<AppResponse<UpdateResult>> {
        return await this.courseService.deleteSubjectForCourse(id, dto, user);
    }

    @Roles(ERolesUser.SUPERVISOR)
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Delete(':id')
    async deleteOneCourse(
        @Param('id') id: string,
        @CurrentUserDecorator() user: User,
    ): Promise<AppResponse<UpdateResult>> {
        return await this.courseService.deleteCourse(id, user);
    }
}
