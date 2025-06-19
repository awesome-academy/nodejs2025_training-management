import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { User } from './entity/user.entity';
import { UsersService } from './user.services';
import { AppResponse } from 'src/types/common.type';
import { UpdateUserDto } from './dto/updateUser.dto';
import { CurrentUserDecorator } from 'src/decorators/current-user.decorator';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/decorators/roles.decorator';
import { ERolesUser } from './enums/index.enum';
import { SessionAuthGuard } from '@modules/auth/guards/session.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';

@ApiTags('users')
@Controller('users')
export class UsersController {
    constructor(private userService: UsersService) {}

    @Roles(ERolesUser.SUPERVISOR, ERolesUser.TRAINEE)
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Patch()
    async updateUser(@Body() dto: UpdateUserDto, @CurrentUserDecorator() user: User): Promise<AppResponse<User>> {
        return {
            data: await this.userService.updateUser(dto, user),
        };
    }
}
