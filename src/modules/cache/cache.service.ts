import { Injectable, Inject } from '@nestjs/common';
import { RedisClientType } from 'redis';

@Injectable()
export class CacheService {
    constructor(@Inject('REDIS_CLIENT') private readonly redisClient: RedisClientType) {}
    async getCache(key: string): Promise<any> {
        const value = await this.redisClient.get(key);
        return value ? JSON.parse(value) : null;
    }

    async setCache(key: string, value: any, ttl: number = 60): Promise<void> {
        await this.redisClient.setEx(key, ttl, JSON.stringify(value));
    }

    async deleteCache(key: string): Promise<void> {
        await this.redisClient.del(key);
    }
}
