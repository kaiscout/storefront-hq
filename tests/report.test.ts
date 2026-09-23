import assert from 'node:assert/strict';
import test from 'node:test';

import {
  auditCoverageSummary,
  evidencePackCsv,
  isEvidencePackReady,
  sortEvidenceFindings,
  type AuditCoveragePage,
  type EvidenceFinding,
  topThreeFixes,
  findingActionBrief,
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

function auditPage(
  overrides: Partial<AuditCoveragePage> = {},
): AuditCoveragePage {
  return {
    id: crypto.randomUUID(),
    url: 'https://shop.example/products/item',
    status_code: 200,
    page_title: 'Product title',
    screenshot_url: 'https://img.example/product.png',
    captured_at: '2026-08-28T10:15:00.000Z',
    recorded_at: '2026-08-28 10:16:00',
    updated_at: '2026-08-28 10:16:00',
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
    auditCoverage: [
      auditPage({
        url: 'https://shop.example/=coverage',
        page_title: '@Formula title',
      }),
    ],
  });
  assert.match(csv, /"'=Danger"/);
  assert.match(csv, /"Price, copy ""conflict"""/);
  assert.match(csv, /"Redirect the route to the live product\."/);
  assert.match(csv, /"AUDIT COVERAGE APPENDIX"/);
  assert.match(csv, /"'@Formula title"/);
  assert.match(csv, /"https:\/\/shop\.example\/=coverage"/);
});

void test('audit coverage summary reports observed statuses without inference', () => {
  assert.deepEqual(
    auditCoverageSummary([
      auditPage(),
      auditPage({ status_code: 302, screenshot_url: null }),
      auditPage({ status_code: 404, screenshot_url: null }),
      auditPage({ status_code: 503, screenshot_url: null }),
      auditPage({ status_code: null, screenshot_url: null }),
    ]),
    {
      total: 5,
      successful: 1,
      redirected: 1,
      clientError: 1,
      serverError: 1,
      unknown: 1,
      screenshots: 1,
    },
  );
});

void test('top-three brief excludes incomplete and identical duplicates without padding', () => {
  const first = finding({ severity: 'critical' });
  const result = topThreeFixes([first, { ...first, id: 'copy' }, finding({ title: 'Incomplete', recommendation: '' }), finding({ title: 'Second', severity: 'low' })]);
  assert.deepEqual(result.map((item) => item.finding.title), ['Broken buying path', 'Second']);
  assert.match(result[0].effort, /Not estimated/);
  assert.match(result[0].impact, /not been assessed/);
  assert.equal(topThreeFixes([]).length, 0);
});

void test('action brief uses recorded owner, impact, fix and acceptance check', () => {
  const brief = findingActionBrief(finding({ recommendation: 'Fix: Repair the destination.\nWhy it matters: Customer cannot reach the guide.\nSuggested owner: Theme developer\nEffort: Confirm after theme review\nRetest: Follow the link; expect HTTP 200 and the guide.' }));
  assert.equal(brief.owner, 'Theme developer');
  assert.equal(brief.fix, 'Repair the destination.');
  assert.match(brief.retest, /HTTP 200/);
  assert.equal(findingActionBrief(finding({ recommendation: 'Fix: First action.\nSecond action.\nRetest: First check.\nSecond check.' })).fix, 'First action.\nSecond action.');
  const csv = evidencePackCsv({ companyName: 'Store', findings: [finding()] });
  assert.ok(csv.indexOf('TOP THREE FIXES') < csv.indexOf('FULL FINDINGS'));
});
