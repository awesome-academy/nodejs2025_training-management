import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as session from 'express-session';
import * as passport from 'passport';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    const configService = app.get(ConfigService);
    const sessionSecret = configService.get<string>('SESSION_SECRET');

    app.useStaticAssets(join(__dirname, '..', 'public'));

    app.use(
        session({
            secret: sessionSecret,
            resave: false,
            saveUninitialized: false,
            cookie: {
                maxAge: 3600000,
                secure: false,
            },
        }),
    );

    app.use(passport.initialize());
    app.use(passport.session());

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            stopAtFirstError: false,
        }),
    );

    const viewsPath = join(__dirname, '..', 'src', 'views');
    app.setViewEngine('pug');
    app.setBaseViewsDir(viewsPath);

    const config = new DocumentBuilder()
        .setTitle('Training System API')
        .setDescription('API documentation for Training System')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    app.enableCors();

    await app.listen(3000);
}
bootstrap();
