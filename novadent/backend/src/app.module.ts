// App 根模組
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClinicsModule } from './clinics/clinics.module';
import { LabsModule } from './labs/labs.module';
import { CasesModule } from './cases/cases.module';
import { ConsultationsModule } from './consultations/consultations.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ArticlesModule } from './articles/articles.module';
import { AdminModule } from './admin/admin.module';
import { DatabaseModule } from './database/database.module';
import { QaQuestionsModule } from './qa-questions/qa-questions.module';
import { MfgStepTemplatesModule } from './mfg-step-templates/mfg-step-templates.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [
    // 載入 .env 環境變數（全域可用）
    ConfigModule.forRoot({ isGlobal: true }),
    // 部署時 serve 前端 build（dist/）
    // 本機開發時 dist/ 不存在也不影響
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', '..', 'dist'),
      exclude: ['/api/(.*)'],
      serveStaticOptions: { fallthrough: true },
    }),
    // 資料庫模組（提供 db 給所有模組）
    DatabaseModule,
    // 功能模組
    AuthModule,
    UsersModule,
    ClinicsModule,
    LabsModule,
    CasesModule,
    ConsultationsModule,
    NotificationsModule,
    ArticlesModule,
    AdminModule,
    QaQuestionsModule,
    MfgStepTemplatesModule,
    UploadModule,
  ],
})
export class AppModule {}
