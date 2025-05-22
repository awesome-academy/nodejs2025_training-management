import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { IResponse } from './interfaces';
import { Reflector } from '@nestjs/core';
import { NO_GLOBAL_INTERCEPTOR } from 'src/decorators/no-global-interceptor.decorator';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
    constructor(private reflector: Reflector) {}
    intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> | Promise<Observable<any>> {
        const skipInterceptor = this.reflector.get<boolean>(NO_GLOBAL_INTERCEPTOR, context.getHandler());
        if (skipInterceptor) {
            return next.handle();
        }
        return next.handle().pipe(
            map(({ data, message }: IResponse) => {
                return {
                    statusCode: context.switchToHttp().getResponse().statusCode,
                    data,
                    message,
                };
            }),
        );
    }
}
