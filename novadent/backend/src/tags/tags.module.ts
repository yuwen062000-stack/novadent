// Tags Module
import { Module } from '@nestjs/common';
import { TagsService } from './tags.service';
import { TagsPublicController, TagsAdminController } from './tags.controller';

@Module({
  controllers: [TagsPublicController, TagsAdminController],
  providers:   [TagsService],
  exports:     [TagsService],
})
export class TagsModule {}
