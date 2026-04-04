// 初始化資料庫（建立所有資料表）
// 執行：npx ts-node src/database/migrate.ts
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

async function runMigrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  console.log('🔌 Connecting to Neon PostgreSQL...');
  const client = postgres(connectionString, { ssl: 'require', max: 1 });
  const db = drizzle(client);

  console.log('📦 Running migrations...');
  await migrate(db, { migrationsFolder: 'drizzle' });

  console.log('✅ Migration complete');
  await client.end();
}

runMigrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
