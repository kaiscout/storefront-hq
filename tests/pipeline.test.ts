import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assessBuyerIntent,
  buildInboundConsultantReply,
  buildProposal,
  canTransition,
  classifyReply,
  extractAuthoredReply,
  extractPublishedReplyEmail,
  isReplyableSourcePlatform,
  scoreOpportunity,
} from '../lib/pipeline.ts';

void test('opt-out language takes precedence over commercial intent', () => {
  assert.equal(
    classifyReply('Interested, but please remove me from all future email'),
    'unsubscribe',
  );
  for (const phrase of [
    "Don't email me again",
    "Please don't reach out to me",
    'Take me off your list',
    'No more emails',
    'STOP',
    'Stop contacting me',
    'Please leave me alone',
  ])
    assert.equal(classifyReply(phrase), 'unsubscribe');
});

void test('classifies common reply states', () => {
  assert.equal(classifyReply('Sounds good — tell me more'), 'interested');
  assert.equal(classifyReply('How much does this cost?'), 'question');
  assert.equal(
    classifyReply('Automatic reply: I am out of the office'),
    'out_of_office',
  );
  assert.equal(classifyReply('No thanks, not a fit'), 'not_interested');
  assert.equal(classifyReply('Can we get scheduled?'), 'question');
  assert.equal(classifyReply('I have not booked yet'), 'question');
  assert.equal(classifyReply("I've booked the call"), 'booked');
  assert.equal(
    classifyReply('I booked someone else, no thanks — not interested'),
    'not_interested',
  );
});

void test('reply extraction removes quoted history before classification', () => {
  const reply = extractAuthoredReply(
    'No\n\nOn Sun, Aug 31, 2026 at 10:00 AM Storefront HQ wrote:\n> Interested?\n> Price: £895',
  );
  assert.equal(reply, 'No');
  assert.equal(classifyReply(reply), 'ambiguous');
});

void test('pipeline rejects unsafe stage skipping', () => {
  assert.equal(canTransition('discovered', 'qualified'), true);
  assert.equal(canTransition('discovered', 'paid'), false);
  assert.equal(canTransition('drafted', 'booked'), true);
  assert.equal(canTransition('paid', 'fulfilling'), true);
  assert.equal(canTransition('fulfilling', 'paid'), false);
});

void test('intent scoring rewards explicit Shopify QA requests', () => {
  const strong = scoreOpportunity({
    title: 'Looking for Shopify QA help before BFCM',
  });
  const weak = scoreOpportunity({ title: 'General ecommerce news' });
  assert.ok(strong.score > weak.score);
  assert.ok(strong.score >= 50);
});

void test('buyer-intent gate accepts a recent explicit request with an on-platform reply route', () => {
  const result = assessBuyerIntent({
    title: 'Looking for Shopify QA help before our launch',
    description:
      'We need someone to test our storefront on mobile and find broken links.',
    url: 'https://www.reddit.com/r/shopify/comments/abc123/looking_for_qa_help/',
    publishedDate: '2 days ago',
    now: new Date('2026-08-28T12:00:00.000Z'),
  });

  assert.equal(result.accepted, true);
  assert.equal(result.contactChannel, 'source-platform');
  assert.equal(result.contactEmail, undefined);
  assert.equal(result.recencyRank, 4);
  assert.ok(result.reasons.includes('explicit request'));
});

void test('buyer-intent gate accepts only an explicitly published direct reply email', () => {
  const accepted = assessBuyerIntent({
    title: 'Shopify storefront QA consultant wanted',
    description:
      'We need our checkout and mobile store tested. Email proposals to owner@merchant.example.',
    url: 'https://merchant.example/request-for-proposals/storefront-qa',
    publishedDate: '2026-08-27T10:00:00Z',
    now: new Date('2026-08-28T12:00:00.000Z'),
  });
  const noReplyRoute = assessBuyerIntent({
    title: 'Shopify storefront QA consultant wanted',
    description: 'We need our checkout and mobile store tested.',
    url: 'https://merchant.example/request-for-proposals/storefront-qa',
    publishedDate: '2026-08-27T10:00:00Z',
    now: new Date('2026-08-28T12:00:00.000Z'),
  });

  assert.equal(accepted.accepted, true);
  assert.equal(accepted.contactChannel, 'direct-email');
  assert.equal(accepted.contactEmail, 'owner@merchant.example');
  assert.equal(noReplyRoute.accepted, false);
  assert.equal(noReplyRoute.rejectionReason, 'no-permitted-reply-channel');
  assert.equal(
    extractPublishedReplyEmail('Footer: hello@merchant.example'),
    undefined,
  );
  assert.equal(
    extractPublishedReplyEmail('Email proposals to owner@merchant.example'),
    'owner@merchant.example',
  );
});

void test('buyer-intent gate rejects vendor pages, articles, employment listings and generic advice', () => {
  const cases = [
    {
      title: 'Looking for Shopify QA? Work with our agency',
      description:
        'Our services help merchants. We offer Shopify quality assurance and mobile testing.',
      url: 'https://agency.example/services/shopify-qa',
      rejectionReason: 'vendor-page',
    },
    {
      title: 'How to run a Shopify QA audit',
      description:
        'A guide for testing ecommerce storefronts and broken links.',
      url: 'https://publisher.example/blog/shopify-qa-guide',
      rejectionReason: 'article-or-guide',
    },
    {
      title: 'Shopify QA tester needed',
      description:
        'Full-time position. Read the job description, responsibilities and qualifications, then apply now.',
      url: 'https://merchant.example/careers/shopify-qa-tester',
      rejectionReason: 'employment-listing',
    },
    {
      title: 'Shopify QA checklist and discussion',
      description: 'General tips for testing an ecommerce store.',
      url: 'https://www.reddit.com/r/shopify/comments/advice123/qa_checklist/',
      rejectionReason: 'not-explicit-request',
    },
  ] as const;

  for (const item of cases) {
    const result = assessBuyerIntent({
      ...item,
      publishedDate: '2026-08-27',
      now: new Date('2026-08-28T12:00:00.000Z'),
    });
    assert.equal(result.accepted, false, item.title);
    assert.equal(result.rejectionReason, item.rejectionReason, item.title);
  }
});

void test('buyer-intent gate rejects explicit no-hire requests and source-platform self-promotion', () => {
  const cases = [
    {
      title: 'New to Shopify CRO, how would you approach this?',
      description:
        "I need help with the workflow, but I'm not looking for someone to do the project for me. I'm only looking for advice and resources.",
      url: 'https://www.reddit.com/r/shopify/comments/nohire123/cro_advice/',
      rejectionReason: 'not-explicit-request',
    },
    {
      title: 'Need help with a slow Shopify store?',
      description:
        'We offer Shopify speed audits through our agency. Book a consultation with our team.',
      url: 'https://www.linkedin.com/posts/vendor123_shopify-speed-activity-123',
      rejectionReason: 'vendor-page',
    },
    {
      title:
        'Looking for Shopify merchants to test a true profit analytics tool',
      description:
        'We are looking for Shopify store owners to test our app and join the beta pilot.',
      url: 'https://community.shopify.com/t/looking-for-shopify-merchants-to-test-a-tool/669687',
      rejectionReason: 'vendor-page',
    },
  ] as const;

  for (const item of cases) {
    const result = assessBuyerIntent({
      ...item,
      publishedDate: '2026-08-27',
      now: new Date('2026-08-28T12:00:00.000Z'),
    });
    assert.equal(result.accepted, false, item.title);
    assert.equal(result.rejectionReason, item.rejectionReason, item.title);
  }
});

void test('buyer-intent gate rejects requests known to be stale', () => {
  const result = assessBuyerIntent({
    title: 'Looking for Shopify QA help',
    description: 'We need someone to audit our ecommerce storefront.',
    url: 'https://www.reddit.com/r/shopify/comments/stale123/qa_help/',
    publishedDate: '2026-06-01',
    now: new Date('2026-08-28T12:00:00.000Z'),
  });

  assert.equal(result.accepted, false);
  assert.equal(result.rejectionReason, 'stale-request');
});

void test('buyer-intent gate enforces 72 hours only when a publication date is usable', () => {
  const common = {
    title: 'Looking for Shopify QA help',
    description:
      'We need someone to audit our ecommerce storefront and test broken links.',
    url: 'https://www.reddit.com/r/shopify/comments/freshness123/qa_help/',
    now: new Date('2026-08-28T12:00:00.000Z'),
  };
  const boundary = assessBuyerIntent({
    ...common,
    publishedDate: '2026-08-25T12:00:00.000Z',
  });
  const tooOld = assessBuyerIntent({
    ...common,
    publishedDate: '2026-08-25T11:59:59.999Z',
  });
  const unknown = assessBuyerIntent(common);

  assert.equal(boundary.accepted, true);
  assert.equal(tooOld.accepted, false);
  assert.equal(tooOld.rejectionReason, 'stale-request');
  assert.equal(unknown.accepted, true);
  assert.equal(unknown.publishedAt, undefined);
});

void test('source-platform allowlist requires a replyable post URL', () => {
  assert.equal(
    isReplyableSourcePlatform(
      'https://community.shopify.com/c/shopify-discussions/storefront-qa/m-p/123',
    ),
    true,
  );
  assert.equal(isReplyableSourcePlatform('https://www.reddit.com/'), false);
  assert.equal(
    isReplyableSourcePlatform('https://www.linkedin.com/jobs/view/123'),
    false,
  );
});

void test('proposal uses evidence without fabricated uplift claims', () => {
  const proposal = buildProposal({
    companyName: 'Example Store',
    contactName: 'Morgan',
    sourceTitle: 'Need Shopify QA',
    proofSummary: '/sale returns 404 on mobile.',
  });
  assert.match(proposal.body, /\/sale returns 404 on mobile/);
  assert.doesNotMatch(proposal.body, /revenue uplift|guaranteed conversion/i);
  assert.match(proposal.body, /\[OPERATOR NAME\]/);
  assert.match(proposal.body, /^Hello Morgan,/);
});

void test('inbound consultant replies answer the buyer context before proposing next steps', () => {
  const reply = buildInboundConsultantReply({
    companyName: 'Example Store',
    contactName: 'Morgan',
    storeUrl: 'https://example-store.test',
    latestSubject: 'Pricing and turnaround?',
    latestMessage:
      'How much does the audit cost, how long does it take, and do you need admin access?',
    classification: 'question',
    calUrl: 'https://cal.example.test/fit',
    operatorName: 'Deniz',
  });
  assert.equal(reply.subject, 'Re: Pricing and turnaround?');
  assert.match(reply.body, /fixed at £895 GBP/);
  assert.match(reply.body, /within 48 hours/);
  assert.match(reply.body, /do not need a Shopify admin login/);
  assert.match(reply.body, /https:\/\/example-store\.test/);
  assert.match(reply.body, /three routes that matter most commercially/);
  assert.match(reply.body, /https:\/\/cal\.example\.test\/fit/);
  assert.doesNotMatch(reply.body, /guaranteed|conversion uplift/i);
});

void test('a booked consultant reply preserves the call without asking to book again', () => {
  const reply = buildInboundConsultantReply({
    companyName: 'Example Store',
    latestMessage: 'I have one question about scope.',
    classification: 'question',
    alreadyBooked: true,
    calUrl: 'https://cal.example.test/fit',
    operatorName: 'Deniz',
  });
  assert.match(reply.body, /fit call already on the calendar/i);
  assert.match(reply.body, /There is no need to book again/i);
  assert.doesNotMatch(reply.body, /https:\/\/cal\.example\.test\/fit/);
});

void test('website-confirmation replies preserve the Gmail thread subject', () => {
  const subject =
    'Storefront QA confirmation [123e4567-e89b-42d3-a456-426614174000]';
  const reply = buildInboundConsultantReply({
    companyName: 'Example Store',
    latestSubject: subject,
    latestMessage: 'I confirm this request.',
    classification: 'website_confirmation',
  });
  assert.equal(reply.subject, `Re: ${subject}`);
});
