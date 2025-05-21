import { Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { UserTaskService } from './user_task.service';
import { AppResponse } from 'src/types/common.type';
import { UpdateResult } from 'typeorm';
import { CurrentUserDecorator } from 'src/decorators/current-user.decorator';
import { User } from '@modules/users/entity/user.entity';
import { Roles } from 'src/decorators/roles.decorator';
import { ERolesUser } from '@modules/users/enums/index.enum';
import { SessionAuthGuard } from '@modules/auth/guards/session.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';

@Controller('user_task')
export class UserTaskController {
    constructor(private readonly userTaskService: UserTaskService) {}

    @Roles(ERolesUser.TRAINEE)
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Patch('finishTask/:id')
    async finishTask(@Param('id') id: string, @CurrentUserDecorator() user: User): Promise<AppResponse<UpdateResult>> {
        return await this.userTaskService.updateStatusForUser(id, user);
    }
}
