import { Module } from '@nestjs/common';
import { MfgStepTemplatesController } from './mfg-step-templates.controller';
import { MfgStepTemplatesService } from './mfg-step-templates.service';

@Module({
  controllers: [MfgStepTemplatesController],
  providers: [MfgStepTemplatesService],
  exports: [MfgStepTemplatesService],
})
export class MfgStepTemplatesModule {}
