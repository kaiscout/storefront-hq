import assert from 'node:assert/strict';
import test from 'node:test';

import {
  integrationState,
  productCheckoutConfig,
  publicConfig,
} from '../lib/config.ts';

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
    CHECKOUT_URL: 'https://buy.stripe.com/14k8wP0example',
    STRIPE_PAYMENT_LINK_ID: 'plink_live_offer',
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
    assert.equal(integrationState().payments, true);
    assert.equal(
      JSON.stringify(publicConfig()).includes(values.STRIPE_PAYMENT_LINK_ID),
      false,
    );

    delete process.env.STRIPE_PAYMENT_LINK_ID;
    assert.equal(publicConfig().launchReady, false);
    assert.equal(integrationState().payments, false);
    process.env.STRIPE_PAYMENT_LINK_ID = values.STRIPE_PAYMENT_LINK_ID;

    for (const checkoutUrl of [
      'https://buy.stripe.com/test_eVa5nPg1j1wmfXq5kr',
      'https://checkout.stripe.com/c/pay/cs_test_example',
      'https://buy.stripe.com/%74est_eVa5nPg1j1wmfXq5kr',
      'https://buy.stripe.com/%2574est_eVa5nPg1j1wmfXq5kr',
      'https://checkout.stripe.com/c/pay/cs_%74est_example',
      'https://buy.stripe.com/test_eVa5nPg1j1wmfXq5kr\\..\\14k8wP0example',
      'https://buy.stripe.com/test_eVa5nPg1j1wmfXq5kr/../14k8wP0example',
      'https://buy.stripe.com/test_eVa5nPg1j1wmfXq5kr/%2e%2e/14k8wP0example',
      'https://buy.stripe.com/14k8wP0ex\r\n\tample',
      'https://buy.stripe.com/14k8wP0example?prefilled_email=buyer%40example.com',
      'https://buy.stripe.com/14k8wP0example#checkout',
    ]) {
      process.env.CHECKOUT_URL = checkoutUrl;
      assert.equal(
        publicConfig().launchReady,
        false,
        `${checkoutUrl} must not open public intake`,
      );
      assert.equal(publicConfig().checkoutUrl, '');
      assert.equal(integrationState().payments, false);
    }

    for (const [checkoutUrl, canonicalUrl] of [
      [values.CHECKOUT_URL, values.CHECKOUT_URL],
      [
        'https://checkout.stripe.com/c/pay/cs_live_example',
        'https://checkout.stripe.com/c/pay/cs_live_example',
      ],
      ['HTTPS://BUY.STRIPE.COM:443/14k8wP0example', values.CHECKOUT_URL],
    ]) {
      process.env.CHECKOUT_URL = checkoutUrl;
      assert.equal(
        publicConfig().launchReady,
        true,
        `${checkoutUrl} should remain launch-ready`,
      );
      assert.equal(publicConfig().checkoutUrl, canonicalUrl);
      assert.equal(publicConfig().checkoutUrl, new URL(checkoutUrl).href);
      assert.equal(integrationState().payments, true);
    }
    process.env.CHECKOUT_URL = values.CHECKOUT_URL;

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

void test('product checkout readiness requires seller identity and a Stripe portal for the club', () => {
  const keys = [
    'PUBLIC_BUSINESS_NAME',
    'PUBLIC_BUSINESS_ADDRESS',
    'STORE_LAUNCH_KIT_CHECKOUT_URL',
    'STORE_LAUNCH_KIT_PAYMENT_LINK_ID',
    'SELLER_CAMPAIGN_CLUB_CHECKOUT_URL',
    'SELLER_CAMPAIGN_CLUB_PAYMENT_LINK_ID',
    'STRIPE_CUSTOMER_PORTAL_URL',
  ];
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    Object.assign(process.env, {
      PUBLIC_BUSINESS_NAME: 'Example Seller Ltd',
      PUBLIC_BUSINESS_ADDRESS: '1 Example Street, London, W1A 1AA',
      STORE_LAUNCH_KIT_CHECKOUT_URL:
        'https://buy.stripe.com/14k8wP0launch',
      STORE_LAUNCH_KIT_PAYMENT_LINK_ID: 'plink_launch',
      SELLER_CAMPAIGN_CLUB_CHECKOUT_URL:
        'https://buy.stripe.com/14k8wP0club',
      SELLER_CAMPAIGN_CLUB_PAYMENT_LINK_ID: 'plink_club',
    });
    delete process.env.STRIPE_CUSTOMER_PORTAL_URL;
    assert.equal(productCheckoutConfig()['store-launch-kit'].ready, true);
    assert.equal(productCheckoutConfig()['seller-campaign-club'].ready, false);

    process.env.STRIPE_CUSTOMER_PORTAL_URL =
      'https://billing.stripe.com/p/login/example_live';
    assert.equal(productCheckoutConfig()['seller-campaign-club'].ready, true);
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
