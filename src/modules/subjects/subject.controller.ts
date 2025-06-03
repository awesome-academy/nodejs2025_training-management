import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { SubjectService } from './subjects.service';
import { CreateSubjectDto } from './dto/createSubject.dto';
import { AppResponse, FindAllResponse } from 'src/types/common.type';
import { Subject } from './entity/subject.entity';
import { UpdateResult } from 'typeorm';
import { UpdateSubjectDto, UpdateSubjectTask } from './dto/updateSubject.dto';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUserDecorator } from 'src/decorators/current-user.decorator';
import { User } from '@modules/users/entity/user.entity';
import { SessionAuthGuard } from '@modules/auth/guards/session.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Task } from '@modules/tasks/entity/task.entity';
import { ERolesUser } from '@modules/users/enums/index.enum';
import { FindSubjectDto } from './dto/find.dto';
import { SubjectResponseDto } from './dto/subjectResponse.dto';

@Controller('subjects')
@ApiTags('subjects')
export class SubjectController {
    constructor(private readonly subjectService: SubjectService) {}

    @Roles(ERolesUser.SUPERVISOR)
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Get()
    async getSubjectDetail(
        @Query('subjectId') subjectId: string,
        @CurrentUserDecorator() user: User,
    ): Promise<AppResponse<SubjectResponseDto>> {
        return await this.subjectService.getSubjectDetail(subjectId, user);
    }

    @Roles(ERolesUser.SUPERVISOR)
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Get('list')
    async getAllSubject(
        @Query() dto: FindSubjectDto,
        @CurrentUserDecorator() user: User,
    ): Promise<AppResponse<FindAllResponse<Subject>>> {
        return await this.subjectService.getSubjectList(dto, user);
    }

    @Roles(ERolesUser.SUPERVISOR)
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Post()
    async createNewSubject(
        @Body() dto: CreateSubjectDto,
        @CurrentUserDecorator() user: User,
    ): Promise<AppResponse<Subject>> {
        return await this.subjectService.createSubject(dto, user);
    }

    @Roles(ERolesUser.SUPERVISOR)
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Patch('info/:id')
    async updateSubjectInfo(
        @Body() dto: UpdateSubjectDto,
        @Param('id') id: string,
    ): Promise<AppResponse<UpdateResult>> {
        return await this.subjectService.updateSubjectInfo(id, dto);
    }

    @Roles(ERolesUser.SUPERVISOR)
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Patch('task/:id')
    @UseGuards(SessionAuthGuard, RolesGuard)
    async updateSubjectTask(@Body() dto: UpdateSubjectTask, @Param('id') id: string): Promise<AppResponse<Task[]>> {
        return await this.subjectService.addTaskForSubject(id, dto);
    }

    @Roles(ERolesUser.SUPERVISOR)
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Delete(':id')
    async deleteSubjectById(
        @Param('id') id: string,
        @CurrentUserDecorator() user: User,
    ): Promise<AppResponse<UpdateResult>> {
        return await this.subjectService.deleteSubject(id, user);
    }
}
