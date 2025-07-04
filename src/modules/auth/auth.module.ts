import { UserModule } from '@modules/users/user.module';
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SessionSerializer } from './serialize/session.serialize';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './strategy/session.strategy';
import { RedisCacheModule } from '@modules/cache/cache.module';
import { QueueModule } from '@modules/queue/queue.module';

@Module({
    imports: [PassportModule.register({ session: true }), UserModule, QueueModule, RedisCacheModule],
    providers: [AuthService, LocalStrategy, SessionSerializer],
    controllers: [AuthController],
})
export class AuthModule {}
