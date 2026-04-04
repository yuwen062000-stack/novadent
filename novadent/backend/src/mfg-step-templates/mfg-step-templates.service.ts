import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, asc } from 'drizzle-orm';
import { Db } from '../database/db';
import { DB_TOKEN } from '../database/database.module';
import { mfgStepTemplates } from '../database/schema';
import { CreateMfgStepTemplateDto, UpdateMfgStepTemplateDto } from './dto/mfg-step-template.dto';

@Injectable()
export class MfgStepTemplatesService {
  constructor(@Inject(DB_TOKEN) private db: Db) {}

  async findAll() {
    return this.db.select().from(mfgStepTemplates).orderBy(asc(mfgStepTemplates.orderIndex));
  }

  async findActive() {
    return this.db
      .select()
      .from(mfgStepTemplates)
      .where(eq(mfgStepTemplates.isActive, true))
      .orderBy(asc(mfgStepTemplates.orderIndex));
  }

  async create(dto: CreateMfgStepTemplateDto) {
    const [t] = await this.db
      .insert(mfgStepTemplates)
      .values({
        name: dto.name,
        description: dto.description ?? null,
        orderIndex: dto.orderIndex ?? 0,
        isDefault: dto.isDefault ?? true,
      } as any)
      .returning();
    return t;
  }

  async update(id: number, dto: UpdateMfgStepTemplateDto) {
    const exists = await this.db.select().from(mfgStepTemplates).where(eq(mfgStepTemplates.id, id));
    if (!exists.length) throw new NotFoundException('模板不存在');
    const [t] = await this.db
      .update(mfgStepTemplates)
      .set({ ...dto, updatedAt: new Date() } as any)
      .where(eq(mfgStepTemplates.id, id))
      .returning();
    return t;
  }

  async reorder(ids: number[]) {
    await Promise.all(
      ids.map((id, index) =>
        this.db.update(mfgStepTemplates).set({ orderIndex: index } as any).where(eq(mfgStepTemplates.id, id))
      )
    );
    return { success: true };
  }

  async deactivate(id: number) {
    const exists = await this.db.select().from(mfgStepTemplates).where(eq(mfgStepTemplates.id, id));
    if (!exists.length) throw new NotFoundException('模板不存在');
    await this.db.update(mfgStepTemplates).set({ isActive: false, updatedAt: new Date() } as any).where(eq(mfgStepTemplates.id, id));
    return { success: true };
  }
}
