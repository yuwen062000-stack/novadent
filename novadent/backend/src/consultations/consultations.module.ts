// Consultations Module — QA 諮詢模組（DatabaseModule 已是 Global）
import { Module } from '@nestjs/common';
import { ConsultationsController } from './consultations.controller';
import { ConsultationsService }    from './consultations.service';

@Module({
  controllers: [ConsultationsController],
  providers:   [ConsultationsService],
  exports:     [ConsultationsService],
})
export class ConsultationsModule {}
