import { Module } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { ArticlesPublicController, ArticlesAdminController } from './articles.controller';

@Module({
  controllers: [ArticlesPublicController, ArticlesAdminController],
  providers: [ArticlesService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
