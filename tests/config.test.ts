import assert from 'node:assert/strict';
import test from 'node:test';

import { publicConfig } from '../lib/config.ts';

void test('public intake requires identity, private access, and every integration', () => {
  const values: Record<string, string> = {
    PUBLIC_OPERATOR_NAME: 'Example Operator',
    PUBLIC_CONTACT_EMAIL: 'hello@example.test',
    OPS_OWNER_EMAIL: 'owner@example.test',
    FIRECRAWL_API_KEY: 'test-key',
    FIRECRAWL_WEBHOOK_SECRET: 'test-firecrawl-secret',
    AUTOMATION_SECRET: 'test-automation-secret',
    CAL_BOOKING_URL: 'https://cal.example.test/fit',
    CAL_WEBHOOK_SECRET: 'test-cal-secret',
    CHECKOUT_URL: 'https://checkout.example.test/pay',
    STRIPE_WEBHOOK_SECRET: 'test-stripe-secret',
    PUBLIC_SITE_URL: 'https://site.example.test',
  };
  const original = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );
  try {
    Object.keys(values).forEach((key) => delete process.env[key]);
    process.env.PUBLIC_OPERATOR_NAME = values.PUBLIC_OPERATOR_NAME;
    process.env.PUBLIC_CONTACT_EMAIL = values.PUBLIC_CONTACT_EMAIL;
    assert.equal(publicConfig().launchReady, false);

    Object.assign(process.env, values);
    assert.equal(publicConfig().launchReady, true);

    process.env.OPS_OWNER_EMAIL = ',';
    assert.equal(publicConfig().launchReady, false);
    process.env.OPS_OWNER_EMAIL = values.OPS_OWNER_EMAIL;

    delete process.env.FIRECRAWL_WEBHOOK_SECRET;
    assert.equal(publicConfig().launchReady, false);
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
