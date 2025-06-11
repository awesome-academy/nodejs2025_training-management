import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { UserRepository } from '@repositories/user.repository';
import { BaseServiceAbstract } from 'src/services/base/base.abstract.service';
import { User } from './entity/user.entity';
import { CreateNewUserDto } from './dto/createNewUser.dto';
import { UpdateUserDto } from './dto/updateUser.dto';
import { EStatusUser } from './enums/index.enum';
import { AppResponse, FindAllResponse } from 'src/types/common.type';
import { ILike, UpdateResult } from 'typeorm';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { getLimitAndSkipHelper } from 'src/helper/pagination.helper';
import * as argon2 from 'argon2';

@Injectable()
export class UsersService extends BaseServiceAbstract<User> {
    constructor(
        @Inject('USER_REPOSITORY')
        private readonly userRepository: UserRepository,
    ) {
        super(userRepository);
    }
    async create(dto: CreateNewUserDto): Promise<User> {
        return await this.userRepository.create(dto);
    }

    async createTrainee(dto: CreateNewUserDto): Promise<AppResponse<User>> {
        const { email, password, ...data } = dto;
        const trainee = await this.userRepository.findOneById(email);
        if (trainee) {
            throw new UnprocessableEntityException('auths.Email is exsisted');
        }
        const hashedPassword = await argon2.hash(password);
        return {
            data: await this.userRepository.create({
                email,
                password: hashedPassword,
                ...data,
            }),
        };
    }

    async getTrainee(dto: PaginationDto): Promise<AppResponse<FindAllResponse<User>>> {
        const { page, pageSize, search } = dto;
        const { skip, limit } = getLimitAndSkipHelper(page, pageSize);
        const condition: any = {};
        if (search) {
            condition.name = ILike(`%${search}%`);
        }
        return {
            data: await this.findAll(condition, {
                skip,
                take: limit,
            }),
        };
    }

    async updateTrainee(traineeId: string, dto: UpdateUserDto): Promise<User> {
        const trainee = await this.userRepository.findOneById(traineeId);
        if (!trainee) {
            throw new NotFoundException('auths.user not found');
        }
        return await this.updateUser(dto, trainee);
    }

    async removeTrainee(traineeId: string): Promise<AppResponse<UpdateResult>> {
        const trainee = await this.userRepository.findOneById(traineeId);
        if (!trainee) {
            throw new NotFoundException('auths.user not found');
        }
        return {
            data: await this.userRepository.update(trainee.id, { status: EStatusUser.INACTIVE }),
        };
    }

    async updateUser(dto: UpdateUserDto, user: User): Promise<User> {
        const { email } = dto;
        if (email !== user.email) {
            const checkEmailIsExsisted = await this.userRepository.findOneByCondition({ email });
            if (checkEmailIsExsisted) {
                throw new UnprocessableEntityException('auths.Email is exists');
            }
        }
        await this.userRepository.update(user.id, dto);
        return await this.userRepository.findOneById(user.id);
    }

    async findUserById(id: string): Promise<User> {
        return await this.userRepository.findOneById(id);
    }

    async findByEmail(email: string): Promise<User | null> {
        return await this.findOneByCondition({ email });
    }

    async deleteUser(id: string) {
        return await this.userRepository.softDelete(id);
    }

    async getUserWithRole(userId: string): Promise<User> {
        return await this.userRepository.findOneById(userId);
    }
}
