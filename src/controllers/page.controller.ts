import { Controller, Get, Query, Param, Res, Render } from '@nestjs/common';
import { Response } from 'express';
import { NoGlobalInterceptor } from '../decorators/no-global-interceptor.decorator';
import { Reflector } from '@nestjs/core';

@Controller('views')
export class PageController {
    constructor(private reflector: Reflector) {}

    @Get('home')
    @NoGlobalInterceptor()
    getHomePage(@Res() res: Response) {
        return res.render('trainee/home');
    }

    @Get('auth')
    @NoGlobalInterceptor()
    getAuthPage(@Query('mode') mode: string, @Res() res: Response) {
        const isLogin = mode !== 'register';
        return res.render('trainee/auth', { isLogin });
    }

    @Get('courses/:id')
    @NoGlobalInterceptor()
    getCourseDetailPage(@Param('id') id: string, @Res() res: Response) {
        return res.render('trainee/course-detail');
    }

    @Get('my-courses')
    @NoGlobalInterceptor()
    getMyCoursesPage(@Res() res: Response) {
        return res.render('trainee/my-courses');
    }

    @Get('auth/forgot')
    @NoGlobalInterceptor()
    forgotPasswdPage(@Res() res: Response) {
        return res.render('supervisor/forgot-password');
    }

    @Get('supervisor/auth')
    @NoGlobalInterceptor()
    getSupervisorAuthPage(@Query('mode') mode: string, @Res() res: Response) {
        const isLogin = mode !== 'register';
        return res.render('supervisor/auth', { isLogin });
    }

    @Get('supervisor')
    @Render('supervisor/home')
    @NoGlobalInterceptor()
    async getSupervisorHome() {}

    @Get('supervisor/courses')
    @Render('supervisor/courses')
    @NoGlobalInterceptor()
    async getSupervisorCourses() {}

    @Get('supervisor/subjects')
    @Render('supervisor/subjects')
    @NoGlobalInterceptor()
    async getSupervisorSubjects() {}

    @Get('supervisor/tasks')
    @Render('supervisor/tasks')
    @NoGlobalInterceptor()
    async getSupervisorTasks() {}

    @Get('supervisor/courses/:id')
    @NoGlobalInterceptor()
    @Render('supervisor/course-detail')
    async getSupervisorCourseDetail() {}

    @Get('supervisor/subjects/:id')
    @NoGlobalInterceptor()
    async getSupervisorSubjectDetail(@Res() res: Response, @Param('id') id: string) {
        return res.render('supervisor/subject-detail', { id });
    }

    @Get('supervisor/courses/create')
    @Render('supervisor/new-course')
    @NoGlobalInterceptor()
    getNewCoursePage() {
        return {
            title: 'Tạo khóa học mới',
        };
    }

    @Get('supervisor/verify')
    @NoGlobalInterceptor()
    getVerifyPage(@Res() res: Response) {
        res.render('supervisor/verify', {
            title: 'Xác thực tài khoản',
            layout: 'layout',
        });
    }

    @Get('supervisor/trainee')
    @Render('supervisor/trainee')
    @NoGlobalInterceptor()
    async getSupervisorTraineePage() {}
}
