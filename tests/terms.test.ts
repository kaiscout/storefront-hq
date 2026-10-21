import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { termsSections, termsUpdated } from '../lib/terms.ts';
import { productCheckoutConfig } from '../lib/config.ts';

void test('expanded terms have unique navigable sections and readable substantive content', () => {
  assert.equal(termsUpdated, '21 October 2026');
  assert.equal(
    new Set(termsSections.map((section) => section.id)).size,
    termsSections.length,
  );
  assert.ok(termsSections.length >= 15);
  assert.ok(termsSections.every((section) => section.paragraphs.length >= 2));
  assert.ok(
    termsSections
      .flatMap((section) => section.paragraphs)
      .join(' ')
      .split(/\s+/).length > 1800,
  );
  const page = readFileSync(
    new URL('../app/terms/page.tsx', import.meta.url),
    'utf8',
  );
  assert.match(page, /Terms & Conditions/);
  assert.match(page, /href="#seller-and-contact"/);
  assert.match(page, /id="seller-and-contact"/);
  assert.match(page, /text-base leading-8/);
  assert.match(page, /products\.map/);
  assert.match(page, /PUBLIC_TERMS_SELLER_NAME/);
  assert.match(
    page,
    /publishing or\s+viewing these terms does not activate checkout/,
  );
  assert.doesNotMatch(page, /dangerouslySetInnerHTML/);
});

void test('terms links open protected new tabs with an accessible notice', () => {
  for (const path of [
    '../components/site-shell.tsx',
    '../app/sample-report/page.tsx',
  ]) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    const links = [...source.matchAll(/<Link\b[^>]*href="\/terms"[^>]*>/g)];
    assert.ok(links.length > 0, path);
    for (const [link] of links) {
      assert.match(link, /target="_blank"/);
      assert.match(link, /rel="noopener noreferrer"/);
      assert.match(
        link,
        /aria-label="Terms & Conditions \(opens in a new tab\)"/,
      );
    }
  }
});

void test('terms-only seller disclosures cannot silently enable product checkout', () => {
  const keys = [
    'PUBLIC_BUSINESS_NAME',
    'PUBLIC_BUSINESS_ADDRESS',
    'PUBLIC_TERMS_SELLER_NAME',
    'PUBLIC_TERMS_SELLER_ADDRESS',
  ];
  const original = Object.fromEntries(
    keys.map((key) => [key, process.env[key]]),
  );
  try {
    delete process.env.PUBLIC_BUSINESS_NAME;
    delete process.env.PUBLIC_BUSINESS_ADDRESS;
    process.env.PUBLIC_TERMS_SELLER_NAME = 'Example Seller';
    process.env.PUBLIC_TERMS_SELLER_ADDRESS = '1 Example Street';
    assert.ok(
      Object.values(productCheckoutConfig()).every(
        (checkout) => !checkout.ready,
      ),
    );
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
