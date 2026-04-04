// 資料庫模組 — 提供 db 給所有 service
import { Module, Global } from '@nestjs/common';
import { db } from './db';

export const DB_TOKEN = 'DRIZZLE_DB';

@Global()
@Module({
  providers: [
    {
      provide: DB_TOKEN,
      useValue: db,
    },
  ],
  exports: [DB_TOKEN],
})
export class DatabaseModule {}
