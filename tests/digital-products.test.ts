import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getDigitalAsset,
  getDigitalAssets,
} from '../lib/digital-products.ts';

void test('Store Launch Kit contains exactly seven editable resources', () => {
  const assets = getDigitalAssets('store-launch-kit');
  assert.equal(assets.length, 7);
  assert.equal(new Set(assets.map((asset) => asset.filename)).size, 7);
  assert.ok(assets.every((asset) => asset.body.trim().length > 100));
});

void test('Campaign Club produces a month-specific practical pack', () => {
  const october = new Date('2026-10-15T12:00:00Z');
  const assets = getDigitalAssets('seller-campaign-club', october);
  assert.equal(assets.length, 1);
  assert.equal(assets[0].filename, 'campaign-club-2026-10.md');
  assert.match(assets[0].body, /October 2026 Campaign Pack/);
  assert.match(assets[0].body, /Four adaptable emails/);
  assert.equal(
    getDigitalAsset(
      'seller-campaign-club',
      'campaign-club-2026-09.md',
      october,
    ),
    null,
  );
});
