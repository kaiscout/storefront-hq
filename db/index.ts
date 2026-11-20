import { env } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export function getDb() {
  if (!env.DB) {
    throw new Error(
      'Cloudflare D1 binding `DB` is unavailable. Check d1_databases in vite.config.ts and wrangler.d1.jsonc.',
    );
  }

  return drizzle(env.DB, { schema });
}
