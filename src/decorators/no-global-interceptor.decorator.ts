import { SetMetadata } from '@nestjs/common';

export const NO_GLOBAL_INTERCEPTOR = 'skip-global-interceptor';
export const NoGlobalInterceptor = () => SetMetadata(NO_GLOBAL_INTERCEPTOR, true);
