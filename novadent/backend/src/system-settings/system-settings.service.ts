import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Db } from '../database/db';
import { DB_TOKEN } from '../database/database.module';
import { systemSettings } from '../database/schema';

@Injectable()
export class SystemSettingsService {
  constructor(@Inject(DB_TOKEN) private db: Db) {}

  async getAll() {
    const rows = await this.db.select().from(systemSettings);
    return rows;
  }

  async getByKey(key: string) {
    const [row] = await this.db.select().from(systemSettings)
      .where(eq(systemSettings.key, key)).limit(1);
    return row || null;
  }

  async upsert(key: string, value: string, description?: string, updatedBy?: string) {
    const existing = await this.getByKey(key);
    if (existing) {
      const [updated] = await this.db.update(systemSettings)
        .set({
          value,
          description: description || existing.description,
          updatedAt: new Date(),
          updatedBy: updatedBy || existing.updatedBy,
        } as any)
        .where(eq(systemSettings.key, key))
        .returning();
      return updated;
    } else {
      const [created] = await this.db.insert(systemSettings).values({
        key,
        value,
        description,
        updatedBy,
      } as any).returning();
      return created;
    }
  }

  async bulkUpsert(items: { key: string; value: string; description?: string }[], updatedBy?: string) {
    const results = [];
    for (const item of items) {
      const result = await this.upsert(item.key, item.value, item.description, updatedBy);
      results.push(result);
    }
    return results;
  }

  async delete(key: string) {
    await this.db.delete(systemSettings).where(eq(systemSettings.key, key));
    return { success: true };
  }
}
