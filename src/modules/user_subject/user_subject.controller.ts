import { Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { UserSubjectService } from './user_subject.service';
import { CurrentUserDecorator } from 'src/decorators/current-user.decorator';
import { Roles } from 'src/decorators/roles.decorator';
import { ERolesUser } from '@modules/users/enums/index.enum';
import { SessionAuthGuard } from '@modules/auth/guards/session.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { User } from '@modules/users/entity/user.entity';

@Controller('user_subject')
export class UserSubjectController {
    constructor(private readonly userSubjectService: UserSubjectService) {}

    @Roles(ERolesUser.TRAINEE)
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Patch('finishSubject/:id')
    async finishSubjecForTrainee(@Param('id') id: string, @CurrentUserDecorator() user: User) {
        return await this.userSubjectService.finishSubjectForTrainee(id, user);
    }
}
