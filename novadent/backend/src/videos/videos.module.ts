import { Module } from '@nestjs/common';
import { VideosService } from './videos.service';
import { VideosPublicController, VideosAdminController } from './videos.controller';

@Module({
  controllers: [VideosPublicController, VideosAdminController],
  providers: [VideosService],
  exports: [VideosService],
})
export class VideosModule {}
