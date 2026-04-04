// 資料庫連線（Drizzle ORM + Neon PostgreSQL）
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Neon 使用 SSL，postgres-js 需要加 ssl: 'require'
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// 建立 postgres 連線（Neon 需要 max: 1 for serverless）
const client = postgres(connectionString, {
  ssl: 'require',
  max: 10,
});

export const db = drizzle(client, { schema });
export type Db = typeof db;
