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
    Res,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateCourseDto } from './dto/createCourse.dto';
import { AppResponse, FindAllResponse } from 'src/types/common.type';
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
import { TraineeDto, UpdateStatusTraineeDto } from './dto/trainee.dto';
import { UserCourse } from '@modules/user_course/entity/user_course.entity';
import { CourseWithoutCreatorDto } from './responseDto/courseResponse.dto';
import { FindMemberOfCourseDto } from './dto/findMember.dto';
import { UserCourseResponse } from '@modules/user_course/dto/UserCourseResponse.dto';
import { DeleteTraineeDto } from './dto/deleteTrainee.dto';
import { Response } from 'express';
import { NoGlobalInterceptor } from 'src/decorators/no-global-interceptor.decorator';

@Controller('courses')
@ApiTags('courses')
export class CourseController {
    constructor(private readonly courseService: CourseService) {}

    @Roles(ERolesUser.SUPERVISOR)
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Get('supervisor/list')
    async getCourseBySupervisor(
        @Query() dto: FindCourseDto,
        @CurrentUserDecorator() user: User,
    ): Promise<AppResponse<FindAllResponse<Course>>> {
        return await this.courseService.supervisorFindCourse(dto, user);
    }

    @Roles(ERolesUser.SUPERVISOR)
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Get('supervisor/detail')
    async getCourseDetailBySupervisor(
        @Query('courseId') courseId: string,
        @CurrentUserDecorator() user: User,
    ): Promise<AppResponse<Course>> {
        return await this.courseService.getCourseDetailForSupervisor(courseId, user);
    }

    @Roles(ERolesUser.SUPERVISOR)
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Post('supervisor/trainee')
    async addTrainee(@Body() dto: TraineeDto, @CurrentUserDecorator() user: User): Promise<AppResponse<UserCourse[]>> {
        return await this.courseService.addTraineesToCourse(dto, user);
    }

    @Roles(ERolesUser.SUPERVISOR)
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Get('supervisor/members')
    async getMemberOfCourses(
        @Query() dto: FindMemberOfCourseDto,
        @CurrentUserDecorator() user: User,
    ): Promise<AppResponse<FindAllResponse<UserCourseResponse>>> {
        return await this.courseService.getAllTraineeCourseForCourse(dto, user);
    }

    @Roles(ERolesUser.SUPERVISOR)
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Patch('supervisor/trainee/:userCourseId')
    async updateTrainee(
        @Param('userCourseId') userCourseId: string,
        @CurrentUserDecorator() user: User,
        @Body() dto: UpdateStatusTraineeDto,
    ): Promise<AppResponse<UserCourse>> {
        return await this.courseService.updateTraineeStatus(userCourseId, user, dto);
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
    async updateCourseInfo(
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
    @Delete(':id')
    async deleteOneCourse(
        @Param('id') id: string,
        @CurrentUserDecorator() user: User,
    ): Promise<AppResponse<UpdateResult>> {
        return await this.courseService.deleteCourse(id, user);
    }

    @Roles(ERolesUser.SUPERVISOR)
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Delete('trainee/:id')
    async deleteTrainee(
        @Param('id') id: string,
        @Body() dto: DeleteTraineeDto,
        @CurrentUserDecorator() user: User,
    ): Promise<AppResponse<boolean>> {
        return await this.courseService.deleteTraineeOfCourse(id, dto, user);
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

    @Roles(ERolesUser.TRAINEE)
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Get('trainee/list')
    async getCourseByTrainee(
        @Query() dto: FindCourseDto,
        @CurrentUserDecorator() user: User,
    ): Promise<AppResponse<CourseWithoutCreatorDto[]>> {
        return await this.courseService.getCourseForTrainee(dto, user);
    }

    @Roles(ERolesUser.TRAINEE)
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Get('trainee/detail')
    async getCourseDetailByTrainee(
        @Query('courseId') courseId: string,
        @CurrentUserDecorator() user: User,
    ): Promise<AppResponse<Course>> {
        return await this.courseService.getCourseDetailForTrainee(courseId, user);
    }

    @Roles(ERolesUser.TRAINEE)
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Get('trainee/members')
    async getMemberOfCourseByTrainee(
        @Query('courseId') courseId: string,
        @CurrentUserDecorator() user: User,
    ): Promise<AppResponse<string[]>> {
        return await this.courseService.getMembersNameOfCourseForTrainee(courseId, user);
    }

    @Roles(ERolesUser.SUPERVISOR)
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Get('supervisor/trainee/export')
    @NoGlobalInterceptor()
    async exportTrainee(
        @Query() dto: FindMemberOfCourseDto,
        @CurrentUserDecorator() user: User,
        @Res() res: Response,
    ): Promise<void> {
        return await this.courseService.exportUsers(dto, user, res);
    }
}
