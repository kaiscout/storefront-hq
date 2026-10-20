import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { productIds } from '../lib/products.ts';

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

void test('original vector artwork covers every catalogue product without remote assets', () => {
  const brand = source('components/brand.tsx');
  for (const id of productIds)
    assert.ok(brand.includes(`product === '${id}'`), id);
  assert.match(brand, /aria-hidden="true"/);
  assert.match(
    source('components/product-card.tsx'),
    /<ProductIcon\s+product=\{product.id\}/,
  );
  assert.match(
    source('app/products/[slug]/page.tsx'),
    /<ProductIcon\s+product=\{product.id\}/,
  );
  for (const path of [
    'components/brand.tsx',
    'components/storefront-illustration.tsx',
    'public/favicon.svg',
  ]) {
    assert.doesNotMatch(
      source(path),
      /<script|<image|<foreignObject|https?:\/\/(?!www.w3.org\/2000\/svg)/i,
    );
  }
});

void test('hero artwork is labelled as illustrative and retains the delivery qualification', () => {
  const art = source('components/storefront-illustration.tsx');
  assert.match(art, /Illustrated workflow/);
  assert.match(art, /role="img"\s+aria-label="Illustration/);
  assert.match(
    art.replace(/\s+/g, ' '),
    /within 24 hours after confirmed payment and receipt of the required public URLs/,
  );
  assert.match(art, /One public retest after repair/);
});

void test('favicon and site logo share the same custom storefront geometry', () => {
  const mark = source('components/brand.tsx');
  const favicon = source('public/favicon.svg');
  for (const geometry of [
    'M14 29V47H37M50 29V33M13 26L18 16H46L51 26',
    'M41.5 45L44.5 48L50 42',
  ]) {
    assert.ok(mark.includes(geometry));
    assert.ok(favicon.includes(geometry));
  }
  assert.match(favicon, /viewBox="0 0 64 64"/);
});
