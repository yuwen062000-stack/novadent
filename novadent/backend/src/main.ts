// Novadent Backend — NestJS 入口
import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cookie 解析（Refresh Token 用）
  app.use(cookieParser());

  // 全域 Exception Filter（統一錯誤格式）
  app.useGlobalFilters(new GlobalExceptionFilter());

  // 全域 JWT Guard（@Public() 可豁免）
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector));

  // 全域輸入驗證（class-validator）
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,          // 自動去除未定義欄位
    forbidNonWhitelisted: false,
    transform: true,          // 自動轉型
  }));

  // CORS（允許前端網址）
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:5173',
  ].filter(Boolean) as string[];

  app.enableCors({
    origin: (origin, callback) => {
      // server-to-server 或同域請求（origin 為 undefined）直接允許
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  });

  // API 前綴
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Novadent API running on port ${port}`);
}

bootstrap();
