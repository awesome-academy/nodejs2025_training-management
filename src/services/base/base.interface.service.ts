import { FindAllResponse } from 'src/types/common.type';
import { DeepPartial, FindOptionsWhere, UpdateResult, DeleteResult, EntityManager } from 'typeorm';

export interface Write<T> {
    create(item: DeepPartial<T>, manager?: EntityManager): Promise<T>;
    update(id: string, item: DeepPartial<T>, manager?: EntityManager): Promise<T | null>;
    upsertDocument(filter: FindOptionsWhere<T>, updateDto: DeepPartial<T>, manager?: EntityManager): Promise<T>;
    remove(id: string, manager?: EntityManager): Promise<boolean>;
    updateMany(filter: FindOptionsWhere<T>, dto: DeepPartial<T>, manager?: EntityManager): Promise<UpdateResult>;
    removeMany(ids: string[], manager?: EntityManager): Promise<DeleteResult>;
}

export interface Read<T> {
    findAll(filter?: FindOptionsWhere<T>, options?: object, manager?: EntityManager): Promise<FindAllResponse<T>>;
    find(filter?: FindOptionsWhere<T>, options?: object, manager?: EntityManager): Promise<T[]>;
    findOne(id: string, options?: object, manager?: EntityManager): Promise<T | null>;
    findOneByCondition(condition: FindOptionsWhere<T>, options?: object, manager?: EntityManager): Promise<T | null>;
}

export interface BaseServiceInterface<T> extends Write<T>, Read<T> {}
