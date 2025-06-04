import { BaseEntity } from '@modules/shared/base/base.entity';
import { BaseRepositoryInterface } from '@repositories/base/base.interface.repository';
import { FindAllResponse } from 'src/types/common.type';
import { BaseServiceInterface } from './base.interface.service';
import { FindOptionsWhere, UpdateResult, DeleteResult, EntityManager } from 'typeorm';
import { DeepPartial } from 'typeorm'; // Ensure you import DeepPartial
import { In } from 'typeorm'; // Import In for removeMany

export abstract class BaseServiceAbstract<T extends BaseEntity> implements BaseServiceInterface<T> {
    constructor(private readonly repository: BaseRepositoryInterface<T>) {}

    async create(createDto: DeepPartial<T>, manager?: EntityManager): Promise<T> {
        return await this.repository.create(createDto, undefined, manager);
    }

    async findAll(
        filter?: FindOptionsWhere<T>,
        options?: object,
        manager?: EntityManager,
    ): Promise<FindAllResponse<T>> {
        return await this.repository.findAll(filter, options, manager);
    }

    async find(filter?: FindOptionsWhere<T>, options?: object, manager?: EntityManager): Promise<T[]> {
        return await this.repository.find(filter, options, manager);
    }

    async findOne(id: string, options?: object, manager?: EntityManager): Promise<T | null> {
        return await this.repository.findOneById(id, options, manager);
    }

    async findOneByCondition(
        filter: FindOptionsWhere<T>,
        options?: object,
        manager?: EntityManager,
    ): Promise<T | null> {
        return await this.repository.findOneByCondition(filter as any, options, manager);
    }

    async update(id: string, updateDto: DeepPartial<T>, manager?: EntityManager): Promise<T | null> {
        await this.repository.update(id, updateDto, manager);
        return this.findOne(id, undefined, manager);
    }

    async upsertDocument(filter: FindOptionsWhere<T>, updateDto: DeepPartial<T>, manager?: EntityManager): Promise<T> {
        return await this.repository.upsertDocument(filter, updateDto, undefined, manager);
    }

    async remove(id: string, manager?: EntityManager): Promise<boolean> {
        const result = await this.repository.softDelete(id, manager);
        return result.affected > 0;
    }

    async updateMany(filter: FindOptionsWhere<T>, dto: DeepPartial<T>, manager?: EntityManager): Promise<UpdateResult> {
        return await this.repository.updateMany(filter, dto, manager);
    }

    async removeMany(ids: string[], manager?: EntityManager): Promise<DeleteResult> {
        const filter: FindOptionsWhere<T> = {
            id: In(ids) as any,
        };
        return await this.repository.softDeleteMany(filter, manager);
    }
}
