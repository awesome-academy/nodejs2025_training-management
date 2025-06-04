import {
    Repository,
    DataSource,
    DeepPartial,
    EntityTarget,
    FindOptionsWhere,
    FindOneOptions,
    SaveOptions,
    UpdateResult,
    DeleteResult,
    SelectQueryBuilder,
    FindManyOptions,
    EntityManager,
} from 'typeorm';
import { BaseEntity } from '@modules/shared/base/base.entity';
import { FindAllResponse } from 'src/types/common.type';
import { BaseRepositoryInterface } from './base.interface.repository';

export abstract class BaseRepositoryAbstract<T extends BaseEntity> implements BaseRepositoryInterface<T> {
    protected readonly repository: Repository<T>;

    constructor(
        entity: EntityTarget<T>,
        private readonly dataSource: DataSource,
    ) {
        this.repository = dataSource.getRepository(entity);
    }

    protected getRepository(manager?: EntityManager): Repository<T> {
        return manager ? manager.getRepository<T>(this.repository.metadata.target) : this.repository;
    }

    async create(dto: DeepPartial<T>, options?: SaveOptions, manager?: EntityManager): Promise<T> {
        const repo = this.getRepository(manager);
        const entity = repo.create(dto);
        return await repo.save(entity, options);
    }

    async insert(dtos: DeepPartial<T>[], manager?: EntityManager): Promise<T[]> {
        const repo = this.getRepository(manager);
        const entities = repo.create(dtos);
        return await repo.save(entities);
    }

    async findOneById(id: string, options?: FindOneOptions<T>, manager?: EntityManager): Promise<T | null> {
        const repo = this.getRepository(manager);
        return await repo.findOne({
            where: { id } as FindOptionsWhere<T>,
            ...options,
        });
    }

    async findOneByCondition(
        condition: FindOptionsWhere<T>,
        options?: FindOneOptions<T>,
        manager?: EntityManager,
    ): Promise<T | null> {
        const repo = this.getRepository(manager);
        return await repo.findOne({ where: condition, ...options });
    }

    async findAll(
        condition: FindOptionsWhere<T>,
        options?: FindManyOptions<T>,
        manager?: EntityManager,
    ): Promise<FindAllResponse<T>> {
        const repo = this.getRepository(manager);
        const [items, count] = await repo.findAndCount({
            where: condition,
            ...options,
        });
        return { count, items };
    }

    async find(condition: FindOptionsWhere<T>, options?: FindOneOptions<T>, manager?: EntityManager): Promise<T[]> {
        const repo = this.getRepository(manager);
        return await repo.find({ where: condition, ...options });
    }

    async update(id: string, dto: DeepPartial<T>, manager?: EntityManager): Promise<UpdateResult> {
        const repo = this.getRepository(manager);
        return await repo.update(id, dto as any);
    }

    async softDelete(id: string, manager?: EntityManager): Promise<UpdateResult> {
        const repo = this.getRepository(manager);
        return await repo.softDelete(id);
    }

    async permanentlyDelete(id: string, manager?: EntityManager): Promise<DeleteResult> {
        const repo = this.getRepository(manager);
        return await repo.delete(id);
    }

    async updateMany(filter: FindOptionsWhere<T>, dto: DeepPartial<T>, manager?: EntityManager): Promise<UpdateResult> {
        const repo = this.getRepository(manager);
        return await repo.update(filter, dto as any);
    }

    async upsertDocument(
        filter: FindOptionsWhere<T>,
        dto: DeepPartial<T>,
        options?: SaveOptions,
        manager?: EntityManager,
    ): Promise<T> {
        const repo = this.getRepository(manager);
        const entity = await repo.preload({ ...filter, ...dto });
        if (!entity) {
            return await repo.save(dto, options);
        }
        return await repo.save(entity);
    }

    async softDeleteMany(filter: FindOptionsWhere<T>, manager?: EntityManager): Promise<UpdateResult> {
        const repo = this.getRepository(manager);
        return await repo.softDelete(filter);
    }

    async deleteMany(filter: FindOptionsWhere<T>, manager?: EntityManager): Promise<DeleteResult> {
        const repo = this.getRepository(manager);
        return await repo.delete(filter);
    }

    async startTransaction() {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.startTransaction();
        return queryRunner;
    }

    createQueryBuilder(alias: string, manager?: EntityManager): SelectQueryBuilder<T> {
        const repo = this.getRepository(manager);
        return repo.createQueryBuilder(alias);
    }
}
