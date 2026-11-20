import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';

// Production Worker settings for Storefront HQ's own Cloudflare account.
// The D1 id must match wrangler.d1.jsonc so local dev and local migrations
// share one database. Secrets are never stored here: set them with
// `npx wrangler secret put NAME` (see docs/operations/cloudflare-hosting.md).
const workerConfig = {
  name: 'storefront-hq',
  main: 'vinext/server/fetch-handler',
  compatibility_date: '2026-08-28',
  compatibility_flags: ['nodejs_compat'],
  // Pre-cutover testing uses the workers.dev URL. Operator routes stay locked
  // there because they require a signed Cloudflare Access token.
  workers_dev: true,
  preview_urls: false,
  observability: { enabled: true },
  vars: {
    PUBLIC_SITE_URL: 'https://storefronthq.co.uk',
    PUBLIC_CONTACT_EMAIL: 'front.storecheckqa@gmail.com',
  },
  d1_databases: [
    {
      binding: 'DB',
      database_name: 'storefront-hq',
      database_id: 'a44231ab-57a6-487a-9062-9520dab85d7e',
      migrations_dir: 'drizzle',
    },
  ],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import('@cloudflare/vite-plugin');

  return {
    css: { postcss: { plugins: [tailwindcss()] } },
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
        config: workerConfig,
      }),
    ],
  };
});
