import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
    constructor(private i18n: I18nService) {}

    async catch(exception: HttpException, host: ArgumentsHost): Promise<void> {
        const context = host.switchToHttp();
        const response = context.getResponse();
        const statusCode = exception.getStatus ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
        const { message } = exception;
        let error: string = exception.message;
        let messages: string[] | string;

        if (exception.getResponse) {
            const eResponse = exception.getResponse() as {
                message: string[] | string;
                error: string;
            };
            messages = eResponse.message;
            error = eResponse.error;
        }

        messages = messages ? messages : ['Maximum concurrent connections'];

        if (!Array.isArray(messages)) {
            messages = [message];
        }

        const messageI18n = await Promise.all(
            messages.map((mes) => {
                const { messageInI18, path } = this._getPathAndMessage(mes);
                return this.i18n.translate(`${path}.${messageInI18}`);
            }),
        );

        const errorResponse = {
            statusCode,
            messages: messageI18n,
            error: error || message,
        };

        response.status(statusCode).json(errorResponse);
    }

    _getPathAndMessage(message): { messageInI18; path } {
        const pathAndMessage = message.split('.');

        switch (pathAndMessage.length) {
            case 1:
                return {
                    messageInI18: pathAndMessage[0],
                    path: 'language',
                };
            case 2:
                return {
                    messageInI18: pathAndMessage[1],
                    path: pathAndMessage[0],
                };
            default:
                return {
                    messageInI18: message,
                    path: 'language',
                };
        }
    }
}
