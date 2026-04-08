// MfgSteps Service — 製程節點管理（掛在 Cases 模組內）
import {
  Injectable, Inject, NotFoundException, ForbiddenException
} from '@nestjs/common';
import { eq, and, asc, sql } from 'drizzle-orm';
import { Db } from '../database/db';
import { DB_TOKEN } from '../database/database.module';
import { mfgSteps, mfgStepTemplates, cases, auditLogs } from '../database/schema';
import { UpdateMfgStepDto } from './dto/case.dto';

// 當模板表無資料時的 fallback（避免建案後完全沒有節點）
const FALLBACK_STEPS = [
  '資料取得', '模型建立', '設計階段', '結構製作',
  '美學與調整', '試戴與修正', '完成與交付',
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

  // ── 建案時自動建立預設製程節點（從 mfg_step_templates 動態讀取）──
  // SuperAdmin 在「進階設定 → 製程模板」管理的模板會自動套用到新案件
  async initDefaultSteps(caseId: string) {
    // 從模板表讀取 isActive=true & isDefault=true 的節點，依 orderIndex 排序
    const templates = await this.db
      .select({ name: mfgStepTemplates.name, orderIndex: mfgStepTemplates.orderIndex })
      .from(mfgStepTemplates)
      .where(and(
        eq(mfgStepTemplates.isActive, true),
        eq(mfgStepTemplates.isDefault, true),
      ))
      .orderBy(asc(mfgStepTemplates.orderIndex));

    // 有模板就用模板，沒有就用 fallback（避免新案件完全沒節點）
    const stepNames = templates.length > 0
      ? templates.map(t => t.name)
      : FALLBACK_STEPS;

    const values = stepNames.map((name, index) => ({
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
