import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, asc, and } from 'drizzle-orm';
import { Db } from '../database/db';
import { DB_TOKEN } from '../database/database.module';
import { qaQuestions } from '../database/schema';
import { CreateQaQuestionDto, UpdateQaQuestionDto } from './dto/qa-question.dto';

@Injectable()
export class QaQuestionsService {
  constructor(@Inject(DB_TOKEN) private db: Db) {}

  async findActive() {
    return this.db
      .select()
      .from(qaQuestions)
      .where(eq(qaQuestions.isActive, true))
      .orderBy(asc(qaQuestions.orderIndex));
  }

  async findAll() {
    return this.db
      .select()
      .from(qaQuestions)
      .orderBy(asc(qaQuestions.orderIndex));
  }

  async create(dto: CreateQaQuestionDto) {
    const [q] = await this.db
      .insert(qaQuestions)
      .values({
        questionText: dto.questionText,
        questionType: (dto.questionType as any) ?? 'single_choice',
        options: dto.options ?? null,
        orderIndex: dto.orderIndex ?? 0,
        category: dto.category ?? null,
      } as any)
      .returning();
    return q;
  }

  async update(id: number, dto: UpdateQaQuestionDto) {
    const exists = await this.db.select().from(qaQuestions).where(eq(qaQuestions.id, id));
    if (!exists.length) throw new NotFoundException('題目不存在');
    const [q] = await this.db
      .update(qaQuestions)
      .set({ ...dto, updatedAt: new Date() } as any)
      .where(eq(qaQuestions.id, id))
      .returning();
    return q;
  }

  async reorder(ids: number[]) {
    await Promise.all(
      ids.map((id, index) =>
        this.db.update(qaQuestions).set({ orderIndex: index } as any).where(eq(qaQuestions.id, id))
      )
    );
    return { success: true };
  }

  async deactivate(id: number) {
    const exists = await this.db.select().from(qaQuestions).where(eq(qaQuestions.id, id));
    if (!exists.length) throw new NotFoundException('題目不存在');
    await this.db.update(qaQuestions).set({ isActive: false, updatedAt: new Date() } as any).where(eq(qaQuestions.id, id));
    return { success: true };
  }
}
