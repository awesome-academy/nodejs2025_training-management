import { Inject, Injectable } from '@nestjs/common';
import { BaseServiceAbstract } from 'src/services/base/base.abstract.service';
import { UserSubject } from './entity/user_subject.entity';
import { UserSubjectRepository } from '@repositories/user_subject.repository';
import { User } from '@modules/users/entity/user.entity';

@Injectable()
export class UserSubjectService extends BaseServiceAbstract<UserSubject> {
    constructor(
        @Inject('USER_SUBJECT_REPOSITORY')
        private readonly userSubjectRepository: UserSubjectRepository,
    ) {
        super(userSubjectRepository);
    }

    async addTraineeForUserSubject(courseSubjectId: string, trainee: User): Promise<UserSubject> {
        return this.userSubjectRepository.create({
            courseSubject: { id: courseSubjectId },
            user: { id: trainee.id },
        });
    }
}
