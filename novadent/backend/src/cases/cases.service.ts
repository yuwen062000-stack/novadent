// Cases Service — 案件管理核心邏輯（含角色隔離與 patientName 遮罩）
import {
  Injectable, Inject, NotFoundException, ForbiddenException, BadRequestException
} from '@nestjs/common';
import { eq, and, ilike, sql, desc } from 'drizzle-orm';
import { Db } from '../database/db';
import { DB_TOKEN } from '../database/database.module';
import {
  cases, clinics, labs, partnerLinks, auditLogs, mfgSteps, users
} from '../database/schema';
import { CreateCaseDto, AssignLabDto } from './dto/case.dto';
import { MfgStepsService } from './mfg-steps.service';

// ── patientName 遮罩工具（只顯示首字、末字，中間 * 替換）────
// 例：「陳小明」→「陳*明」、「李明」→「李*」、「張」→「張」
function maskPatientName(name: string): string {
  if (!name) return '';
  if (name.length <= 1) return name;
  if (name.length === 2) return name[0] + '*';
  // 3 字以上：首字 + * + 末字
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
}

@Injectable()
export class CasesService {
  constructor(
    @Inject(DB_TOKEN) private db: Db,
    private mfgStepsService: MfgStepsService,
  ) {}

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
      targetType: 'case',
      targetId,
      detail: detail ?? null,
    } as any).catch(() => {});
  }

  // ── 取診所 ID（by userId）────────────────────────────────
  // 支援子帳號：先查直接對應，找不到再用 parentId 查父帳號的診所
  private async getClinicByUserId(userId: string) {
    let [clinic] = await this.db
      .select({ id: clinics.id })
      .from(clinics)
      .where(eq(clinics.userId, userId))
      .limit(1);

    if (!clinic) {
      const [user] = await this.db
        .select({ parentId: users.parentId })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (user?.parentId) {
        [clinic] = await this.db
          .select({ id: clinics.id })
          .from(clinics)
          .where(eq(clinics.userId, user.parentId))
          .limit(1);
      }
    }

    if (!clinic) throw new ForbiddenException('找不到對應的診所資料');
    return clinic;
  }

  // ── 取牙技所 ID（by userId）──────────────────────────────
  // 支援子帳號：先查直接對應，找不到再用 parentId 查父帳號的牙技所
  private async getLabByUserId(userId: string) {
    let [lab] = await this.db
      .select({ id: labs.id })
      .from(labs)
      .where(eq(labs.userId, userId))
      .limit(1);

    if (!lab) {
      const [user] = await this.db
        .select({ parentId: users.parentId })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (user?.parentId) {
        [lab] = await this.db
          .select({ id: labs.id })
          .from(labs)
          .where(eq(labs.userId, user.parentId))
          .limit(1);
      }
    }

    if (!lab) throw new ForbiddenException('找不到對應的牙技所資料');
    return lab;
  }

  // ── Admin 取全部案件（分頁）─────────────────────────────
  async findAll(query: {
    clinicId?: string;
    labId?: string;
    status?: string;
    type?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page     = query.page     ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset   = (page - 1) * pageSize;

    const conditions: any[] = [];
    if (query.clinicId) conditions.push(eq(cases.clinicId, query.clinicId));
    if (query.labId)    conditions.push(eq(cases.labId,    query.labId));
    if (query.status)   conditions.push(eq(cases.status,   query.status as any));
    if (query.type)     conditions.push(eq(cases.type,     query.type   as any));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await this.db
      .select()
      .from(cases)
      .where(whereClause)
      .orderBy(desc(cases.createdAt))
      .limit(pageSize)
      .offset(offset);

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(cases)
      .where(whereClause);

    return { data: rows, total: count, page, pageSize };
  }

  // ── Clinic 取自己診所的案件 ──────────────────────────────
  async findByClinic(clinicUserId: string, query: {
    status?: string;
    type?: string;
    page?: number;
    pageSize?: number;
  }) {
    const clinic   = await this.getClinicByUserId(clinicUserId);
    const page     = query.page     ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset   = (page - 1) * pageSize;

    const conditions: any[] = [eq(cases.clinicId, clinic.id)];
    if (query.status) conditions.push(eq(cases.status, query.status as any));
    if (query.type)   conditions.push(eq(cases.type,   query.type   as any));

    const rows = await this.db
      .select({
        id:           cases.id,
        clinicId:     cases.clinicId,
        labId:        cases.labId,
        memberId:     cases.memberId,
        patientName:  cases.patientName,
        type:         cases.type,
        status:       cases.status,
        description:  cases.description,
        progress:     cases.progress,
        currentStage: cases.currentStage,
        createdAt:    cases.createdAt,
        updatedAt:    cases.updatedAt,
        // JOIN labs 表帶入牙技所名稱
        labName:      labs.name,
      })
      .from(cases)
      .leftJoin(labs, eq(cases.labId, labs.id))
      .where(and(...conditions))
      .orderBy(desc(cases.createdAt))
      .limit(pageSize)
      .offset(offset);

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(cases)
      .where(and(...conditions));

    return { data: rows, total: count, page, pageSize };
  }

  // ── Lab 取案件（合作診所案件 + 直接指派給本牙技所的案件）──
  // 修正：原邏輯只看 partner_links 的 clinicId，導致診所直接指派
  // 給牙技所的案件（cases.lab_id = lab.id）看不到
  async findByLab(labUserId: string, query: {
    status?: string;
    type?: string;
    page?: number;
    pageSize?: number;
  }) {
    const lab      = await this.getLabByUserId(labUserId);
    const page     = query.page     ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset   = (page - 1) * pageSize;

    // 取 partner_links 中該 Lab 關聯的所有 clinic_id
    const linkedClinics = await this.db
      .select({ clinicId: partnerLinks.clinicId })
      .from(partnerLinks)
      .where(and(
        eq(partnerLinks.labId,  lab.id),
        eq(partnerLinks.status, 'ACTIVE'),
      ));

    const clinicIds = linkedClinics.map(l => l.clinicId);

    // 基礎條件：合作診所的案件 OR 直接指派給本牙技所的案件
    let baseCondition;
    if (clinicIds.length > 0) {
      // 有合作診所時：案件屬於合作診所 OR 案件的 lab_id 指向本牙技所
      baseCondition = sql`(${cases.clinicId} = ANY(ARRAY[${sql.join(clinicIds.map(id => sql`${id}::uuid`), sql`, `)}]) OR ${cases.labId} = ${lab.id})`;
    } else {
      // 無合作診所時：只看直接指派給本牙技所的案件
      baseCondition = eq(cases.labId, lab.id);
    }

    const conditions: any[] = [baseCondition];
    if (query.status) conditions.push(eq(cases.status, query.status as any));
    if (query.type)   conditions.push(eq(cases.type,   query.type   as any));

    const rows = await this.db
      .select({
        id:           cases.id,
        clinicId:     cases.clinicId,
        labId:        cases.labId,
        memberId:     cases.memberId,
        // Lab 看到的 patientName 需要遮罩
        patientName:  cases.patientName,
        type:         cases.type,
        status:       cases.status,
        description:  cases.description,
        progress:     cases.progress,
        currentStage: cases.currentStage,
        createdAt:    cases.createdAt,
        updatedAt:    cases.updatedAt,
        // JOIN clinics 表帶入診所名稱
        clinicName:   clinics.name,
      })
      .from(cases)
      .leftJoin(clinics, eq(cases.clinicId, clinics.id))
      .where(and(...conditions))
      .orderBy(desc(cases.createdAt))
      .limit(pageSize)
      .offset(offset);

    // 遮罩 patientName
    const maskedRows = rows.map(row => ({
      ...row,
      patientName: maskPatientName(row.patientName),
    }));

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(cases)
      .where(and(...conditions));

    return { data: maskedRows, total: count, page, pageSize };
  }

  // ── Member 取自己的案件 ──────────────────────────────────
  async findByMember(memberId: string) {
    const rows = await this.db
      .select({
        id:           cases.id,
        type:         cases.type,
        status:       cases.status,
        progress:     cases.progress,
        currentStage: cases.currentStage,
        createdAt:    cases.createdAt,
        updatedAt:    cases.updatedAt,
        // Member 看自己的案件不需遮罩 patientName（就是自己）
        patientName:  cases.patientName,
      })
      .from(cases)
      .where(eq(cases.memberId, memberId))
      .orderBy(desc(cases.createdAt));

    return rows;
  }

  // ── 跨角色取自己的案件 ────────────────────────────────────
  async findMyCases(userId: string, role: string) {
    switch (role) {
      case 'CLINIC':
        return this.findByClinic(userId, {});
      case 'LAB':
        return this.findByLab(userId, {});
      case 'MEMBER':
        return { data: await this.findByMember(userId), total: 0, page: 1, pageSize: 100 };
      case 'ADMIN':
      case 'SUPER_ADMIN':
        return this.findAll({});
      default:
        return { data: [], total: 0, page: 1, pageSize: 20 };
    }
  }

  // ── 取案件 + 製程節點（內部 helper）────────────────────────
  private async fetchCaseWithSteps(caseId: string) {
    const [caseRow] = await this.db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
    if (!caseRow) throw new NotFoundException('案件不存在');
    const steps = await this.mfgStepsService.getStepsByCase(caseId);
    return { ...caseRow, mfgSteps: steps };
  }

  // ── 取單一案件（依角色過濾 internalNotes 和 patientName）──
  // 回傳包含 mfgSteps，供前端 LabCaseDetail / ClinicCaseDetail 使用
  async findById(id: string, userId: string, role: string) {
    const [caseRow] = await this.db
      .select()
      .from(cases)
      .where(eq(cases.id, id))
      .limit(1);

    if (!caseRow) throw new NotFoundException('案件不存在');

    // 角色權限控制
    if (role === 'MEMBER' && caseRow.memberId !== userId) {
      throw new ForbiddenException('無權存取此案件');
    }

    if (role === 'CLINIC') {
      const clinic = await this.getClinicByUserId(userId);
      if (caseRow.clinicId !== clinic.id) throw new ForbiddenException('無權存取此案件');
    }

    // 取製程節點（所有角色都需要）
    const steps = await this.mfgStepsService.getStepsByCase(id);

    if (role === 'LAB') {
      const lab = await this.getLabByUserId(userId);
      // 確認此案件的診所在 partner_links 中
      const [link] = await this.db
        .select({ id: partnerLinks.id })
        .from(partnerLinks)
        .where(and(
          eq(partnerLinks.labId,    lab.id),
          eq(partnerLinks.clinicId, caseRow.clinicId),
          eq(partnerLinks.status,   'ACTIVE'),
        ))
        .limit(1);

      if (!link) throw new ForbiddenException('無權存取此案件');

      // Lab 看 patientName 需遮罩
      return { ...caseRow, patientName: maskPatientName(caseRow.patientName), mfgSteps: steps };
    }

    return { ...caseRow, mfgSteps: steps };
  }

  // ── Clinic 建案 ──────────────────────────────────────────
  async create(clinicUserId: string, dto: CreateCaseDto) {
    const clinic = await this.getClinicByUserId(clinicUserId);

    // ── 自動比對會員（姓名 + 生日 mapping）──
    // 若診所填了病患姓名和生日，嘗試在 users 表找到對應的 MEMBER
    let memberId = dto.memberId || null;
    if (!memberId && dto.patientBirthday) {
      const [matched] = await this.db
        .select({ id: users.id })
        .from(users)
        .where(and(
          eq(users.name, dto.patientName),
          eq(users.birthday, dto.patientBirthday),
          eq(users.role, 'MEMBER'),
          eq(users.status, 'ACTIVE'),
        ))
        .limit(1);
      if (matched) memberId = matched.id;
    }

    const [newCase] = await this.db.insert(cases).values({
      clinicId:         clinic.id,
      patientName:      dto.patientName,
      patientBirthday:  dto.patientBirthday || null,
      type:             dto.type as any,
      description:      dto.description,
      memberId,
      status:           'CREATED',
      progress:         0,
    } as any).returning();

    // 自動建立預設製程節點（從 mfg_step_templates 動態讀取 SuperAdmin 設定的模板）
    await this.mfgStepsService.initDefaultSteps(newCase.id);

    await this.writeAuditLog(clinicUserId, 'CREATE_CASE', newCase.id, {
      clinicId: clinic.id,
      type:     dto.type,
    });

    return newCase;
  }

  // ── Clinic 指派牙技所 ────────────────────────────────────
  async assignLab(caseId: string, labId: string, clinicUserId: string) {
    const caseRow = await this.findById(caseId, clinicUserId, 'CLINIC');

    if (caseRow.status !== 'CREATED') {
      throw new BadRequestException('僅 CREATED 狀態的案件可以指派牙技所');
    }

    // 確認 lab 存在
    const [lab] = await this.db
      .select({ id: labs.id })
      .from(labs)
      .where(eq(labs.id, labId))
      .limit(1);

    if (!lab) throw new NotFoundException('牙技所不存在');

    await this.db.update(cases)
      .set({ labId, status: 'ASSIGNED', updatedAt: new Date() } as any)
      .where(eq(cases.id, caseId));

    await this.writeAuditLog(clinicUserId, 'ASSIGN_LAB', caseId, { labId });

    return this.db.select().from(cases).where(eq(cases.id, caseId)).limit(1).then(r => r[0]);
  }

  // ── Lab 接單 ─────────────────────────────────────────────
  async acceptCase(caseId: string, labUserId: string) {
    const lab = await this.getLabByUserId(labUserId);

    const [caseRow] = await this.db
      .select()
      .from(cases)
      .where(and(eq(cases.id, caseId), eq(cases.labId, lab.id)))
      .limit(1);

    if (!caseRow) throw new NotFoundException('案件不存在或非指派給此牙技所');

    if (caseRow.status !== 'ASSIGNED') {
      throw new BadRequestException('僅 ASSIGNED 狀態的案件可以接單');
    }

    await this.db.update(cases)
      .set({ status: 'ACCEPTED', updatedAt: new Date() } as any)
      .where(eq(cases.id, caseId));

    await this.writeAuditLog(labUserId, 'ACCEPT_CASE', caseId, { labId: lab.id });

    // 回傳完整案件（含製程節點）供前端 LabCaseDetail 更新畫面
    return this.fetchCaseWithSteps(caseId);
  }

  // ── Clinic 確認結案 ──────────────────────────────────────
  async complete(caseId: string, clinicUserId: string) {
    const caseRow = await this.findById(caseId, clinicUserId, 'CLINIC');

    if (!['IN_PROGRESS', 'ACCEPTED'].includes(caseRow.status)) {
      throw new BadRequestException('案件狀態不允許結案');
    }

    await this.db.update(cases)
      .set({ status: 'COMPLETED', progress: 100, updatedAt: new Date() } as any)
      .where(eq(cases.id, caseId));

    await this.writeAuditLog(clinicUserId, 'COMPLETE_CASE', caseId);

    return this.db.select().from(cases).where(eq(cases.id, caseId)).limit(1).then(r => r[0]);
  }

  // ── Lab 新增製程步驟 ─────────────────────────────────────
  // 允許 LAB 在接案後自由新增額外製程節點（非預設的 7 個）
  async addMfgStep(caseId: string, dto: { name: string }, userId: string) {
    // 確認案件存在
    const [caseRow] = await this.db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
    if (!caseRow) throw new NotFoundException('案件不存在');

    // 取目前最大的 order 值，新步驟排在最後
    const existing = await this.mfgStepsService.getStepsByCase(caseId);
    const nextOrder = existing.length > 0
      ? Math.max(...existing.map((s: any) => s.order ?? 0)) + 1
      : 1;

    await this.db.insert(mfgSteps).values({
      caseId,
      name:   dto.name,
      order:  nextOrder,
      status: 'PENDING',
    } as any);

    await this.writeAuditLog(userId, 'ADD_MFG_STEP', caseId, { name: dto.name });

    // 回傳完整案件（含更新後的製程節點）
    return this.fetchCaseWithSteps(caseId);
  }

  // ── 通用更新狀態（內部使用）─────────────────────────────
  async updateStatus(caseId: string, status: string, userId: string) {
    await this.db.update(cases)
      .set({ status: status as any, updatedAt: new Date() } as any)
      .where(eq(cases.id, caseId));

    await this.writeAuditLog(userId, 'UPDATE_CASE_STATUS', caseId, { newStatus: status });

    return this.db.select().from(cases).where(eq(cases.id, caseId)).limit(1).then(r => r[0]);
  }
}
