import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SupervisorCourseService } from './supervisor_course.service';
import { FindAllSupervisorOfCourseDto } from './dto/findAllSupervisor.dto';
import { CurrentUserDecorator } from 'src/decorators/current-user.decorator';
import { AppResponse, FindAllResponse } from 'src/types/common.type';
import { SupervisorCourseResponseDto } from './dto/SupervisorCourseResponse.dto';
import { User } from '@modules/users/entity/user.entity';
import { Roles } from 'src/decorators/roles.decorator';
import { ERolesUser } from '@modules/users/enums/index.enum';
import { SessionAuthGuard } from '@modules/auth/guards/session.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { ApiTags } from '@nestjs/swagger';

@Controller('supervisor_course')
@ApiTags('supervisor_course')
export class SupervisorCourseController {
    constructor(private readonly supervisorCourseService: SupervisorCourseService) {}

    @Roles(ERolesUser.SUPERVISOR)
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Get()
    async findAllSupervisorCourse(
        @Query() dto: FindAllSupervisorOfCourseDto,
        @CurrentUserDecorator() user: User,
    ): Promise<AppResponse<FindAllResponse<SupervisorCourseResponseDto>>> {
        return await this.supervisorCourseService.getAllSupervisorOfCourse(dto, user);
    }
}
