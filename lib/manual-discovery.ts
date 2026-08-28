import { z } from 'zod';

import type { BuyerIntentAssessment } from './pipeline.ts';

const seventyTwoHoursMs = 72 * 60 * 60 * 1000;
const emailAddressPattern =
  /[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+/i;

const manualDiscoverySchema = z.strictObject({
  url: z
    .url()
    .trim()
    .max(1000)
    .refine((value) => value.startsWith('https://'), 'Use an HTTPS source URL'),
  title: z.string().trim().min(5).max(300),
  description: z.string().trim().min(20).max(1800),
  publishedAt: z.iso.datetime({ offset: true }),
});

type ManualDiscoveryInput = z.infer<typeof manualDiscoverySchema>;

type StoredOpportunity = {
  url: string;
  title: string;
  description: string;
  score: number;
  reasons: string[];
  contactChannel: 'source-platform';
  publishedAt: string;
};

export type ManualDiscoveryDependencies = {
  isAuthorized: (request: Request) => boolean;
  assessBuyerIntent: (input: {
    title: string;
    description: string;
    url: string;
    publishedDate: string;
    now: Date;
  }) => BuyerIntentAssessment;
  insertDiscoveredOpportunities: (
    opportunities: StoredOpportunity[],
  ) => Promise<number>;
  now?: () => Date;
};

function containsEmailAddress(input: ManualDiscoveryInput) {
  const values = [input.url, input.title, input.description];
  return values.some((value) => {
    if (emailAddressPattern.test(value)) return true;
    try {
      return emailAddressPattern.test(decodeURIComponent(value));
    } catch {
      return false;
    }
  });
}

export function createManualDiscoveryHandler(
  dependencies: ManualDiscoveryDependencies,
) {
  return async function POST(request: Request) {
    if (!dependencies.isAuthorized(request))
      return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const parsed = manualDiscoverySchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      return Response.json(
        { error: 'Invalid manual discovery payload' },
        { status: 400 },
      );

    const now = dependencies.now?.() ?? new Date();
    let assessment: BuyerIntentAssessment;
    try {
      assessment = dependencies.assessBuyerIntent({
        url: parsed.data.url,
        title: parsed.data.title,
        description: parsed.data.description,
        publishedDate: parsed.data.publishedAt,
        now,
      });
    } catch {
      return Response.json(
        { error: 'Manual discovery could not be assessed' },
        { status: 502 },
      );
    }

    if (!assessment.accepted)
      return Response.json(
        {
          error: 'Source did not pass buyer-intent review',
          reason: assessment.rejectionReason ?? 'rejected',
        },
        { status: 422 },
      );
    if (assessment.contactChannel !== 'source-platform')
      return Response.json(
        { error: 'Only source-platform opportunities are accepted' },
        { status: 422 },
      );

    const ageMs = now.getTime() - Date.parse(parsed.data.publishedAt);
    if (ageMs < 0 || ageMs > seventyTwoHoursMs)
      return Response.json(
        { error: 'Source must be published within the last 72 hours' },
        { status: 422 },
      );
    if (containsEmailAddress(parsed.data))
      return Response.json(
        { error: 'Email addresses are not accepted' },
        { status: 422 },
      );

    try {
      const saved = await dependencies.insertDiscoveredOpportunities([
        {
          url: parsed.data.url,
          title: parsed.data.title,
          description: parsed.data.description,
          score: assessment.score,
          reasons: assessment.reasons,
          contactChannel: 'source-platform',
          publishedAt: assessment.publishedAt ?? parsed.data.publishedAt,
        },
      ]);
      return Response.json({ ok: true, count: 1, saved });
    } catch {
      return Response.json(
        { error: 'Manual discovery could not be stored' },
        { status: 502 },
      );
    }
  };
}
