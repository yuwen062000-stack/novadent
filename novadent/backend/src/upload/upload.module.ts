import { Module } from '@nestjs/common';
import { UploadController, UploadServeController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  controllers: [UploadController, UploadServeController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
