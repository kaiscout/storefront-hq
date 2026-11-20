import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';

// Production Worker settings for Storefront HQ's own Cloudflare account.
// The D1 id must match wrangler.d1.jsonc so local dev and local migrations
// share one database. Secrets are never stored here: set them with
// `npx wrangler secret put NAME` (see docs/operations/cloudflare-hosting.md).
const workerConfig = {
  name: 'storefront-hq',
  // front.storecheckqa@gmail.com's account, which also holds the domain.
  account_id: '2342ec65d99f0a96ec7352bd24307dea',
  main: 'vinext/server/fetch-handler',
  compatibility_date: '2026-08-28',
  compatibility_flags: ['nodejs_compat'],
  routes: [
    { pattern: 'storefronthq.co.uk', custom_domain: true },
    { pattern: 'www.storefronthq.co.uk', custom_domain: true },
  ],
  // Public traffic uses the custom domains only.
  workers_dev: false,
  preview_urls: false,
  observability: { enabled: true },
  vars: {
    PUBLIC_SITE_URL: 'https://storefronthq.co.uk',
    PUBLIC_CONTACT_EMAIL: 'front.storecheckqa@gmail.com',
    // Sign-off name on reply drafts; also required for intake to open.
    PUBLIC_OPERATOR_NAME: 'Deniz',
  },
  d1_databases: [
    {
      binding: 'DB',
      database_name: 'storefront-hq',
      database_id: 'ba9083cd-1164-4301-adc0-d19e80fe9aa5',
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
