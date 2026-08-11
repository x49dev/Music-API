import 'dotenv/config';
import { z } from 'zod';

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().default('sqlite:./data.db'),
  REDIS_URL: z.string().optional(),
  YOUTUBE_API_KEY: z.string().optional(),
  CACHE_TTL_SEARCH: z.coerce.number().default(300),
  CACHE_TTL_TRACK: z.coerce.number().default(3600),
  CACHE_TTL_PLAYLIST: z.coerce.number().default(3600),
  CACHE_TTL_ARTIST: z.coerce.number().default(86400),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  RATE_LIMIT_WINDOW: z.coerce.number().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  YTDLP_PATH: z.string().default('yt-dlp'),
});

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;

export type Config = z.infer<typeof configSchema>;
