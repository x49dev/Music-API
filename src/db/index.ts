import { config } from '../config/index.js';
import { drizzle } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { Pool } from 'pg';
import Database from 'better-sqlite3';
import * as schema from './schema.js';

let db: ReturnType<typeof drizzle<typeof schema>> | ReturnType<typeof drizzleSqlite<typeof schema>>;

if (
  config.DATABASE_URL.startsWith('postgresql://') ||
  config.DATABASE_URL.startsWith('postgres://')
) {
  const pool = new Pool({
    connectionString: config.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
  });

  db = drizzle(pool, { schema, logger: config.NODE_ENV === 'development' });
} else {
  const sqlitePath = config.DATABASE_URL.replace('sqlite:', '');
  const sqlite = new Database(sqlitePath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  db = drizzleSqlite(sqlite, { schema, logger: config.NODE_ENV === 'development' });
}

export { db, schema };

export async function closeDb(): Promise<void> {
  if (
    config.DATABASE_URL.startsWith('postgresql://') ||
    config.DATABASE_URL.startsWith('postgres://')
  ) {
    const pool = db.$client as Pool;
    await pool.end();
  } else {
    const sqlite = db.$client as Database.Database;
    sqlite.close();
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    if (
      config.DATABASE_URL.startsWith('postgresql://') ||
      config.DATABASE_URL.startsWith('postgres://')
    ) {
      const pool = db.$client as Pool;
      await pool.query('SELECT 1');
    } else {
      const sqlite = db.$client as Database.Database;
      sqlite.prepare('SELECT 1').get();
    }
    return true;
  } catch {
    return false;
  }
}
