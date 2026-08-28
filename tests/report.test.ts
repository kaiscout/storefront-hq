import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evidencePackCsv,
  isEvidencePackReady,
  sortEvidenceFindings,
  type EvidenceFinding,
} from '../lib/report.ts';

function finding(overrides: Partial<EvidenceFinding> = {}): EvidenceFinding {
  return {
    id: crypto.randomUUID(),
    url: 'https://shop.example/products/item',
    title: 'Broken buying path',
    severity: 'high',
    category: 'broken-route',
    evidence: 'The public route returned HTTP 404.',
    recommendation: 'Redirect the route to the live product.',
    found_at: '2026-08-28T10:00:00.000Z',
    ...overrides,
  };
}

void test('evidence findings sort by severity and then URL', () => {
  const sorted = sortEvidenceFindings([
    finding({ severity: 'medium', url: 'https://shop.example/z' }),
    finding({ severity: 'critical', url: 'https://shop.example/b' }),
    finding({ severity: 'critical', url: 'https://shop.example/a' }),
  ]);
  assert.deepEqual(
    sorted.map((item) => [item.severity, item.url]),
    [
      ['critical', 'https://shop.example/a'],
      ['critical', 'https://shop.example/b'],
      ['medium', 'https://shop.example/z'],
    ],
  );
});

void test('delivery readiness requires complete fix-ready findings', () => {
  const result = isEvidencePackReady(
    [finding(), finding({ recommendation: null })],
    2,
  );
  assert.deepEqual(result, {
    ready: false,
    complete: 1,
    required: 2,
    missing: 1,
  });
});

void test('CSV export quotes fields and neutralizes spreadsheet formulas', () => {
  const csv = evidencePackCsv({
    companyName: '=Danger',
    storeUrl: 'https://shop.example',
    findings: [finding({ title: 'Price, copy "conflict"' })],
  });
  assert.match(csv, /"'=Danger"/);
  assert.match(csv, /"Price, copy ""conflict"""/);
  assert.match(csv, /"Redirect the route to the live product\."/);
});
