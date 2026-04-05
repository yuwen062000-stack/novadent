import { Module, OnModuleInit } from '@nestjs/common';
import { SiteImagesService } from './site-images.service';
import { SiteImagesPublicController, SiteImagesAdminController } from './site-images.controller';

@Module({
  controllers: [SiteImagesPublicController, SiteImagesAdminController],
  providers: [SiteImagesService],
  exports: [SiteImagesService],
})
export class SiteImagesModule implements OnModuleInit {
  constructor(private siteImagesService: SiteImagesService) {}

  async onModuleInit() {
    await this.siteImagesService.ensureDefaults();
  }
}
