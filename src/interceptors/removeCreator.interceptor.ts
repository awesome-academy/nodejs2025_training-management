import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

@Injectable()
export class RemoveCreatorInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        function removeCreatorDeep(obj: any): any {
            if (Array.isArray(obj)) {
                return obj.map(removeCreatorDeep);
            } else if (obj && typeof obj === 'object') {
                const newObj = { ...obj };
                if ('creator' in newObj) {
                    delete newObj.creator;
                }
                for (const key in newObj) {
                    if (newObj.hasOwnProperty(key)) {
                        newObj[key] = removeCreatorDeep(newObj[key]);
                    }
                }
                return newObj;
            }
            return obj;
        }

        return next.handle().pipe(
            map((response) => {
                const { data, ...rest } = response;

                rest.data = removeCreatorDeep(data);

                return rest;
            }),
        );
    }
}
