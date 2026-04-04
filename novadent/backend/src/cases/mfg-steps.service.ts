// MfgSteps Service — 製程節點管理（掛在 Cases 模組內）
import {
  Injectable, Inject, NotFoundException, ForbiddenException
} from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { Db } from '../database/db';
import { DB_TOKEN } from '../database/database.module';
import { mfgSteps, cases, auditLogs } from '../database/schema';
import { UpdateMfgStepDto } from './dto/case.dto';

// 預設 7 個製程節點（placeholder，待確認後可調整）
const DEFAULT_STEPS = [
  '資料取得',
  '模型建立',
  '設計階段',
  '結構製作',
  '美學與調整',
  '試戴與修正',
  '完成與交付',
];

@Injectable()
export class MfgStepsService {
  constructor(@Inject(DB_TOKEN) private db: Db) {}

  // ── 寫入操作日誌 ──────────────────────────────────────────
  private async writeAuditLog(
    userId: string,
    action: string,
    targetId?: string,
    detail?: any,
  ) {
    await this.db.insert(auditLogs).values({
      userId,
      action,
      targetType: 'mfg_step',
      targetId,
      detail: detail ?? null,
    } as any).catch(() => {});
  }

  // ── 取案件的所有製程節點 ─────────────────────────────────
  async getStepsByCase(caseId: string) {
    return this.db
      .select()
      .from(mfgSteps)
      .where(eq(mfgSteps.caseId, caseId))
      .orderBy(mfgSteps.order);
  }

  // ── 建案時自動建立 7 個預設節點 ──────────────────────────
  async initDefaultSteps(caseId: string) {
    const values = DEFAULT_STEPS.map((name, index) => ({
      caseId,
      name,
      order:  index + 1,
      status: 'PENDING' as const,
    }));

    await this.db.insert(mfgSteps).values(values as any);
  }

  // ── Lab 更新製程節點 ─────────────────────────────────────
  async updateStep(stepId: string, labUserId: string, dto: UpdateMfgStepDto) {
    // 取節點資訊
    const [step] = await this.db
      .select()
      .from(mfgSteps)
      .where(eq(mfgSteps.id, stepId))
      .limit(1);

    if (!step) throw new NotFoundException('製程節點不存在');

    // 更新節點
    await this.db.update(mfgSteps)
      .set({
        status:    dto.status as any,
        note:      dto.note,
        photoUrl:  dto.photoUrl,
        updatedAt: new Date(),
        updatedBy: labUserId,
      } as any)
      .where(eq(mfgSteps.id, stepId));

    await this.writeAuditLog(labUserId, 'UPDATE_STEP', stepId, {
      caseId:    step.caseId,
      stepName:  step.name,
      newStatus: dto.status,
    });

    // 重算案件進度
    await this.recalculateProgress(step.caseId);

    return this.getStepsByCase(step.caseId);
  }

  // ── 重算案件整體進度（完成節點數 / 總節點數 * 100）───────
  async recalculateProgress(caseId: string) {
    const steps = await this.getStepsByCase(caseId);
    if (steps.length === 0) return;

    const completed = steps.filter(s => s.status === 'COMPLETED').length;
    const progress  = Math.round((completed / steps.length) * 100);

    // 取最新的 IN_PROGRESS 節點作為 currentStage
    const inProgressStep = steps.find(s => s.status === 'IN_PROGRESS');
    const lastCompleted  = [...steps].reverse().find(s => s.status === 'COMPLETED');
    const currentStage   = inProgressStep?.name ?? lastCompleted?.name ?? null;

    await this.db.update(cases)
      .set({
        progress,
        currentStage,
        updatedAt: new Date(),
      } as any)
      .where(eq(cases.id, caseId));
  }
}
