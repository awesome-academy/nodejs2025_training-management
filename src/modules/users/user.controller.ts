import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { User } from './entity/user.entity';
import { UsersService } from './user.services';
import { AppResponse, FindAllResponse } from 'src/types/common.type';
import { UpdateUserDto } from './dto/updateUser.dto';
import { CurrentUserDecorator } from 'src/decorators/current-user.decorator';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/decorators/roles.decorator';
import { ERolesUser } from './enums/index.enum';
import { SessionAuthGuard } from '@modules/auth/guards/session.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { UpdateResult } from 'typeorm';
import { UpdateTraineeDto } from './dto/updateTrainee.dto';
import { CreateTraineeDto } from './dto/createTrainee.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
    constructor(private userService: UsersService) {}

    @Roles(ERolesUser.SUPERVISOR, ERolesUser.TRAINEE)
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Get('me')
    async getCurrentInfo(@CurrentUserDecorator() user: User): Promise<AppResponse<User>> {
        return await this.userService.getCurrentUser(user);
    }

    @Roles(ERolesUser.SUPERVISOR, ERolesUser.TRAINEE)
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Patch()
    async updateUser(@Body() dto: UpdateUserDto, @CurrentUserDecorator() user: User): Promise<AppResponse<User>> {
        return {
            data: await this.userService.updateUser(dto, user),
        };
    }

    @Roles(ERolesUser.SUPERVISOR)
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Get('trainees')
    async getAllTrainee(@Query() dto: PaginationDto): Promise<AppResponse<FindAllResponse<User>>> {
        return await this.userService.getTrainee(dto);
    }

    @Roles(ERolesUser.SUPERVISOR)
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Post('trainees')
    async createNewTrainee(@Body() dto: CreateTraineeDto): Promise<AppResponse<User>> {
        return await this.userService.createTrainee(dto);
    }

    @Roles(ERolesUser.SUPERVISOR)
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Patch('trainees/:traineeId')
    async updateTraineeProfile(
        @Param('traineeId') id: string,
        @Body() dto: UpdateTraineeDto,
    ): Promise<AppResponse<User>> {
        return await this.userService.updateTrainee(id, dto);
    }

    @Roles(ERolesUser.SUPERVISOR)
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Delete('trainees/:traineeId')
    async changeUserStatus(@Param('traineeId') id: string): Promise<AppResponse<UpdateResult>> {
        return await this.userService.removeTrainee(id);
    }
}
