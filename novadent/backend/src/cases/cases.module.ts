// Cases Module — 案件管理模組（含製程節點 MfgSteps，DatabaseModule 已是 Global）
import { Module } from '@nestjs/common';
import { CasesController }  from './cases.controller';
import { CasesService }     from './cases.service';
import { MfgStepsService }  from './mfg-steps.service';

@Module({
  controllers: [CasesController],
  providers:   [CasesService, MfgStepsService], // MfgStepsService 與 CasesService 共存
  exports:     [CasesService, MfgStepsService],
})
export class CasesModule {}
