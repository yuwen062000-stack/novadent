import { Module, OnModuleInit } from '@nestjs/common';
import { PageContentsService } from './page-contents.service';
import { PageContentsPublicController, PageContentsAdminController } from './page-contents.controller';

@Module({
  controllers: [PageContentsPublicController, PageContentsAdminController],
  providers: [PageContentsService],
  exports: [PageContentsService],
})
export class PageContentsModule implements OnModuleInit {
  constructor(private pageContentsService: PageContentsService) {}

  async onModuleInit() {
    await this.pageContentsService.ensureDefaults();
  }
}
