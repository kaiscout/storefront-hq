import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildProposal,
  canTransition,
  classifyReply,
  scoreOpportunity,
} from '../lib/pipeline.ts';

void test('opt-out language takes precedence over commercial intent', () => {
  assert.equal(
    classifyReply('Interested, but please remove me from all future email'),
    'unsubscribe',
  );
});

void test('classifies common reply states', () => {
  assert.equal(classifyReply('Sounds good — tell me more'), 'interested');
  assert.equal(classifyReply('How much does this cost?'), 'question');
  assert.equal(
    classifyReply('Automatic reply: I am out of the office'),
    'out_of_office',
  );
  assert.equal(classifyReply('No thanks, not a fit'), 'not_interested');
});

void test('pipeline rejects unsafe stage skipping', () => {
  assert.equal(canTransition('discovered', 'qualified'), true);
  assert.equal(canTransition('discovered', 'paid'), false);
  assert.equal(canTransition('paid', 'fulfilling'), true);
});

void test('intent scoring rewards explicit Shopify QA requests', () => {
  const strong = scoreOpportunity({
    title: 'Looking for Shopify QA help before BFCM',
  });
  const weak = scoreOpportunity({ title: 'General ecommerce news' });
  assert.ok(strong.score > weak.score);
  assert.ok(strong.score >= 50);
});

void test('proposal uses evidence without fabricated uplift claims', () => {
  const proposal = buildProposal({
    companyName: 'Example Store',
    sourceTitle: 'Need Shopify QA',
    proofSummary: '/sale returns 404 on mobile.',
  });
  assert.match(proposal.body, /\/sale returns 404 on mobile/);
  assert.doesNotMatch(proposal.body, /revenue uplift|guaranteed conversion/i);
  assert.match(proposal.body, /\[OPERATOR NAME\]/);
});
