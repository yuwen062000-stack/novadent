// Sitemap Controller — 動態生成 sitemap.xml
// 每次被 Google 爬蟲存取時，即時從 DB 讀取最新的診所、牙技所、文章清單
// 好處：新增診所/文章後不需手動維護，自動出現在 sitemap 中
import { Controller, Get, Res, Inject } from '@nestjs/common';
import { Response } from 'express';
import { eq } from 'drizzle-orm';
import { Public } from '../common/decorators/public.decorator';
import { Db } from '../database/db';
import { DB_TOKEN } from '../database/database.module';
import { clinics, labs, articles } from '../database/schema';

@Public()
@Controller('')
export class SitemapController {
  constructor(@Inject(DB_TOKEN) private db: Db) {}

  // GET /sitemap.xml — 動態生成 sitemap（優先於 public/sitemap.xml 靜態檔）
  @Get('sitemap.xml')
  async getSitemap(@Res() res: Response) {
    const BASE = 'https://novadent.replit.app';
    const today = new Date().toISOString().split('T')[0];

    // 靜態頁面
    const staticUrls = [
      { loc: `${BASE}/`,           priority: '1.0', changefreq: 'weekly' },
      { loc: `${BASE}/about`,      priority: '0.8', changefreq: 'monthly' },
      { loc: `${BASE}/clinics`,    priority: '0.9', changefreq: 'daily' },
      { loc: `${BASE}/labs`,       priority: '0.9', changefreq: 'daily' },
      { loc: `${BASE}/education`,  priority: '0.7', changefreq: 'weekly' },
      { loc: `${BASE}/videos`,     priority: '0.7', changefreq: 'weekly' },
      { loc: `${BASE}/terms`,      priority: '0.3', changefreq: 'yearly' },
      { loc: `${BASE}/privacy`,    priority: '0.3', changefreq: 'yearly' },
    ];

    // 動態頁面：診所、牙技所、文章
    let dynamicUrls: { loc: string; priority: string; changefreq: string }[] = [];
    try {
      const [activeClinics, activeLabs, publishedArticles] = await Promise.all([
        this.db.select({ id: clinics.id }).from(clinics).where(eq(clinics.status, 'ACTIVE')),
        this.db.select({ id: labs.id }).from(labs).where(eq(labs.status, 'ACTIVE')),
        this.db.select({ id: articles.id }).from(articles).where(eq((articles as any).status, 'PUBLISHED')),
      ]);

      dynamicUrls = [
        ...activeClinics.map(c  => ({ loc: `${BASE}/clinics/${c.id}`,  priority: '0.7', changefreq: 'monthly' })),
        ...activeLabs.map(l     => ({ loc: `${BASE}/labs/${l.id}`,     priority: '0.7', changefreq: 'monthly' })),
        ...publishedArticles.map(a => ({ loc: `${BASE}/article/${a.id}`, priority: '0.6', changefreq: 'monthly' })),
      ];
    } catch (e) {
      // DB 查詢失敗時只回傳靜態頁面（不中斷 sitemap）
      console.error('[Sitemap] DB query failed:', e);
    }

    const allUrls = [...staticUrls, ...dynamicUrls];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.send(xml);
  }
}
