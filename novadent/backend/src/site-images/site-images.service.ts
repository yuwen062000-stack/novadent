import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../database/database.module';
import { siteImages } from '../database/schema';

type Db = any;

@Injectable()
export class SiteImagesService {
  constructor(@Inject(DB_TOKEN) private db: Db) {}

  async findAll(page?: string) {
    if (page) {
      return this.db.select().from(siteImages).where(eq(siteImages.page, page)).orderBy(siteImages.sortOrder);
    }
    return this.db.select().from(siteImages).orderBy(siteImages.page, siteImages.sortOrder);
  }

  async create(data: { page: string; position: string; title?: string; blockType?: string; textContent?: string; imageUrl?: string; altText?: string }, userId: string) {
    const maxOrder = await this.db.select({ max: sql<number>`coalesce(max(sort_order), 0)` }).from(siteImages).where(eq(siteImages.page, data.page));
    const nextOrder = (maxOrder[0]?.max ?? 0) + 1;

    const [row] = await this.db.insert(siteImages).values({
      page: data.page,
      position: data.position,
      title: data.title || null,
      blockType: data.blockType || 'image',
      textContent: data.textContent || null,
      imageUrl: data.imageUrl || null,
      altText: data.altText || null,
      sortOrder: nextOrder,
      visible: true,
      updatedBy: userId,
    } as any).returning();
    return row;
  }

  async update(id: string, data: any, userId: string) {
    const [existing] = await this.db.select().from(siteImages).where(eq(siteImages.id, id)).limit(1);
    if (!existing) throw new NotFoundException('圖片不存在');

    const updateData: any = { updatedAt: new Date(), updatedBy: userId };
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.altText !== undefined) updateData.altText = data.altText;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.textContent !== undefined) updateData.textContent = data.textContent;
    if (data.blockType !== undefined) updateData.blockType = data.blockType;
    if (data.visible !== undefined) updateData.visible = data.visible;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

    const [updated] = await this.db.update(siteImages)
      .set(updateData)
      .where(eq(siteImages.id, id))
      .returning();
    return updated;
  }

  async reorder(items: { id: string; sortOrder: number }[], userId: string) {
    for (const item of items) {
      await this.db.update(siteImages)
        .set({ sortOrder: item.sortOrder, updatedAt: new Date(), updatedBy: userId } as any)
        .where(eq(siteImages.id, item.id));
    }
    return { success: true };
  }

  async delete(id: string) {
    const [existing] = await this.db.select().from(siteImages).where(eq(siteImages.id, id)).limit(1);
    if (!existing) throw new NotFoundException('圖片不存在');
    await this.db.delete(siteImages).where(eq(siteImages.id, id));
    return { success: true };
  }

  async ensureDefaults() {
    const existing = await this.db.select().from(siteImages);
    if (existing.length > 0) return;

    const defaults = [
      { page: 'HOME', position: 'HERO', imageUrl: '/S__14336065_0_0.jpg', altText: '首頁主視覺', sortOrder: 1, blockType: 'image', visible: true },
      { page: 'HOME', position: 'CHALLENGE', imageUrl: '/S__14336040_0_0.jpg', altText: '挑戰區塊圖片', sortOrder: 2, blockType: 'image', visible: true },
      { page: 'ABOUT', position: 'ABOUT_1', title: '關於諾星事業股份有限公司', blockType: 'text', textContent: '諾星事業股份有限公司致力於推動牙科產業的數位轉型與整合服務，透過旗下 Novadent 牙科整合平台，建立一個連結牙醫診所、牙體技術所、保險服務與牙科供應鏈的智慧牙科生態系。\n\n公司由具備多年牙科產業經驗的專業團隊創立，深刻理解牙醫臨床與牙技製作流程中的溝通與管理痛點，並以科技與平台化思維，開發數位化工具與服務，提升牙科醫療服務的效率與品質。', sortOrder: 1, visible: true },
      { page: 'ABOUT', position: 'ABOUT_2', title: '重新定義牙科產業的未來', imageUrl: '/S__14549039_0.jpg', blockType: 'image', sortOrder: 2, visible: true },
      { page: 'ABOUT', position: 'ABOUT_3', title: 'Novadent 平台生態', imageUrl: '/S__14336066_0_0.jpg', blockType: 'image', sortOrder: 3, visible: true },
      { page: 'ABOUT', position: 'ABOUT_4', title: '平台核心引擎', imageUrl: '/S__14549043_0.jpg', blockType: 'image', sortOrder: 4, visible: true },
      { page: 'ABOUT', position: 'ABOUT_5', title: '平台運作方式', imageUrl: '/S__14295053_0.jpg', blockType: 'image', sortOrder: 5, visible: true },
      { page: 'ABOUT', position: 'ABOUT_6', title: '跨業整合醫療創新平台', imageUrl: '/S__14549042_0.jpg', blockType: 'image', sortOrder: 6, visible: true },
      { page: 'ABOUT', position: 'ABOUT_7', title: '臺灣牙科體系的結構性斷層', imageUrl: '/S__14336078_0_0.jpg', blockType: 'image', sortOrder: 7, visible: true },
      { page: 'ABOUT', position: 'ABOUT_8', title: '台灣首創「牙科 × 金融 × 長照」整合生態系', imageUrl: '/S__14549041_0.jpg', blockType: 'image', sortOrder: 8, visible: true },
      { page: 'ABOUT', position: 'ABOUT_9', title: '關於創辦人', blockType: 'text', textContent: '創辦人具備牙技師專業背景，長期深耕牙科產業，累積多年臨床技術製作與產業實務經驗。\n\n在實務經驗中，觀察到診所與牙技所之間普遍存在資訊斷裂、工單管理效率低落與溝通成本高等問題，進而促成創立諾星事業股份有限公司。', sortOrder: 9, visible: true },
      { page: 'ABOUT', position: 'ABOUT_10', title: '未來藍圖：立足台灣，佈局亞洲', imageUrl: '/S__14549040_0.jpg', blockType: 'image', sortOrder: 10, visible: true },
    ];

    await this.db.insert(siteImages).values(defaults);
  }
}
