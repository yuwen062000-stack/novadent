import { Module } from '@nestjs/common';
import { QaQuestionsController } from './qa-questions.controller';
import { QaQuestionsService } from './qa-questions.service';

@Module({
  controllers: [QaQuestionsController],
  providers: [QaQuestionsService],
  exports: [QaQuestionsService],
})
export class QaQuestionsModule {}
