import { defineConfig } from 'drizzle-kit';
import { config } from './src/config/index.js';

const isPostgres = config.DATABASE_URL.startsWith('postgresql://') || config.DATABASE_URL.startsWith('postgres://');

export default defineConfig({
  dialect: isPostgres ? 'postgresql' : 'sqlite',
  schema: './src/db/schema.ts',
  out: './drizzle/migrations',
  dbCredentials: isPostgres
    ? { url: config.DATABASE_URL }
    : { url: config.DATABASE_URL.replace('sqlite:', '') },
  verbose: true,
  strict: true,
});