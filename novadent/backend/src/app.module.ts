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
import { SystemSettingsModule } from './system-settings/system-settings.module';
import { MailModule } from './mail/mail.module';
import { SiteImagesModule } from './site-images/site-images.module';
import { VideosModule } from './videos/videos.module';
import { PageContentsModule } from './page-contents/page-contents.module';
import { TagsModule } from './tags/tags.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', '..', 'dist'),
      exclude: ['/api/{*path}'],
      serveStaticOptions: { index: 'index.html' },
    }),
    DatabaseModule,
    MailModule,
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
    SystemSettingsModule,
    SiteImagesModule,
    VideosModule,
    PageContentsModule,
    TagsModule,
  ],
})
export class AppModule {}
