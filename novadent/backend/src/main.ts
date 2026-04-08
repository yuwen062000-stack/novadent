import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { join } from 'path';
import { existsSync } from 'fs';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { autoSeed } from './database/auto-seed';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  app.use(cookieParser());

  // 禁止 Replit Google CDN 快取所有 API 回應
  // 根因：CDN 回 304 Not Modified 導致前端拿到舊資料（tag、案件列表等）
  expressApp.use('/api', (req: any, res: any, next: any) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    next();
  });

  app.useGlobalFilters(new GlobalExceptionFilter());

  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector));

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false,
    transform: true,
  }));

  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:3001', 'http://localhost:5173'];
  if (process.env.REPLIT_DEV_DOMAIN) {
    allowedOrigins.push(`https://${process.env.REPLIT_DEV_DOMAIN}`);
  }
  if (process.env.REPLIT_DOMAINS) {
    process.env.REPLIT_DOMAINS.split(',').forEach(d => allowedOrigins.push(`https://${d}`));
  }
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  const indexPath = join(__dirname, '..', '..', '..', 'dist', 'index.html');
  if (existsSync(indexPath)) {
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.use((req: any, res: any, next: any) => {
      if (
        req.method === 'GET' &&
        !req.path.startsWith('/api') &&
        !req.path.includes('.')
      ) {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        return res.sendFile(indexPath);
      }
      next();
    });
    console.log('SPA fallback enabled');
  }

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`Novadent API running on port ${port}`);

  autoSeed().catch(err => console.error('Auto-seed error:', err.message));
}

bootstrap();
