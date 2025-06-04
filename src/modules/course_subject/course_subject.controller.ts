import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { SessionAuthGuard } from '@modules/auth/guards/session.guard';
import { ERolesUser } from '@modules/users/enums/index.enum';
import { Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/decorators/roles.decorator';
import { AppResponse } from 'src/types/common.type';
import { UpdateResult } from 'typeorm';
import { CourseSubjectService } from './course_subject.service';
import { User } from '@modules/users/entity/user.entity';
import { CurrentUserDecorator } from 'src/decorators/current-user.decorator';

@Controller('course_subject')
@ApiTags('course_subject')
export class CourseSubjectController {
    constructor(private readonly courseSubjectService: CourseSubjectService) {}
    @Roles(ERolesUser.SUPERVISOR)
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Patch(':id')
    async finishSubjectOfCourse(
        @Param('id') id: string,
        @CurrentUserDecorator() user: User,
    ): Promise<AppResponse<UpdateResult>> {
        return await this.courseSubjectService.finishSubjectForCourse(id, user);
    }
}
