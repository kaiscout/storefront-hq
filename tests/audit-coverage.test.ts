import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

import { auditPageUpsertSql } from '../lib/audit-coverage.ts';

void test('coverage upsert keeps one page and never erases captured evidence', () => {
  const database = new DatabaseSync(':memory:');
  try {
    database.exec(
      "CREATE TABLE leads (id TEXT PRIMARY KEY); INSERT INTO leads (id) VALUES ('lead-1');",
    );
    const migration = readFileSync(
      new URL('../drizzle/0004_silky_scarecrow.sql', import.meta.url),
      'utf8',
    ).replaceAll('--> statement-breakpoint', '');
    database.exec(migration);
    const upsert = database.prepare(auditPageUpsertSql);
    upsert.run(
      'page-1',
      'lead-1',
      'https://shop.example/products/item',
      200,
      'Product title',
      'https://img.example/product.png',
      '2026-08-28T10:15:00.000Z',
    );
    upsert.run(
      'duplicate-delivery',
      'lead-1',
      'https://shop.example/products/item',
      404,
      null,
      null,
      null,
    );

    const rows = database.prepare('SELECT * FROM audit_pages').all() as Record<
      string,
      unknown
    >[];
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.status_code, 404);
    assert.equal(rows[0]?.page_title, 'Product title');
    assert.equal(rows[0]?.screenshot_url, 'https://img.example/product.png');
    assert.equal(rows[0]?.captured_at, '2026-08-28T10:15:00.000Z');
  } finally {
    database.close();
  }
});
