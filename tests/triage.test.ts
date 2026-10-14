import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createTriagePlan,
  isTriageReach,
  isTriageSymptom,
  isTriageTiming,
  triageSymptoms,
} from '../lib/triage.ts';

void test('triage covers every visible symptom with an actionable plan', () => {
  for (const symptom of triageSymptoms) {
    const plan = createTriagePlan(symptom.id, 'unknown', 'now');
    assert.ok(plan.title);
    assert.ok(plan.summary.includes('preserve evidence'));
    assert.equal(plan.checks.length, 3);
    assert.ok(plan.acceptance);
    assert.ok(plan.evidence.length >= 4);
  }
});

void test('triage query guards reject arbitrary values', () => {
  assert.equal(isTriageSymptom('buying-path'), true);
  assert.equal(isTriageSymptom('anything'), false);
  assert.equal(isTriageReach('mobile'), true);
  assert.equal(isTriageReach('all-users'), false);
  assert.equal(isTriageTiming('recent'), true);
  assert.equal(isTriageTiming('yesterday'), false);
});

void test('urgent public failures route to Store Emergency Check', () => {
  for (const symptom of ['buying-path', 'recent-change'] as const) {
    assert.equal(
      createTriagePlan(symptom, 'mobile', 'recent').productId,
      'store-emergency-check',
    );
  }
});
