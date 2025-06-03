import {
    FindOptionsWhere,
    FindOneOptions,
    SaveOptions,
    UpdateResult,
    DeleteResult,
    DeepPartial,
    SelectQueryBuilder,
    FindManyOptions,
    EntityManager,
} from 'typeorm';
import { FindAllResponse } from 'src/types/common.type';

export interface BaseRepositoryInterface<T> {
    create(dto: DeepPartial<T>, options?: SaveOptions, manager?: EntityManager): Promise<T>;
    insert(dtos: DeepPartial<T>[], manager?: EntityManager): Promise<T[]>;
    findOneById(id: string, options?: FindOneOptions<T>, manager?: EntityManager): Promise<T | null>;
    findOneByCondition(
        condition: FindOptionsWhere<T>,
        options?: FindOneOptions<T>,
        manager?: EntityManager,
    ): Promise<T | null>;
    findAll(
        condition: FindOptionsWhere<T>,
        options?: FindManyOptions<T>,
        manager?: EntityManager,
    ): Promise<FindAllResponse<T>>;
    find(condition: FindOptionsWhere<T>, options?: FindOneOptions<T>, manager?: EntityManager): Promise<T[]>;
    update(id: string, dto: DeepPartial<T>, manager?: EntityManager): Promise<UpdateResult>; // Ensure DeepPartial<T> is used
    softDelete(id: string, manager?: EntityManager): Promise<UpdateResult>;
    permanentlyDelete(id: string, manager?: EntityManager): Promise<DeleteResult>;
    updateMany(filter: FindOptionsWhere<T>, dto: DeepPartial<T>, manager?: EntityManager): Promise<UpdateResult>;
    upsertDocument(
        filter: FindOptionsWhere<T>,
        dto: DeepPartial<T>,
        options?: SaveOptions,
        manager?: EntityManager,
    ): Promise<T>;
    softDeleteMany(filter: FindOptionsWhere<T>, manager?: EntityManager): Promise<UpdateResult>;
    deleteMany(filter: FindOptionsWhere<T>, manager?: EntityManager): Promise<DeleteResult>;
    createQueryBuilder(alias: string, manager?: EntityManager): SelectQueryBuilder<T>;
}
