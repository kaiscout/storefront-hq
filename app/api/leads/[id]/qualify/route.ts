import { z } from 'zod';

import {
  addFinding,
  getLead,
  isSuppressed,
  markQualified,
} from '@/lib/database';
import {
  deriveCorpusFindings,
  deriveDeterministicFindings,
  isSuccessfulStorefrontDocument,
  runStorefrontPreflight,
} from '@/lib/firecrawl';
import { isOperatorRequest } from '@/lib/operator-auth';

const qualifySchema = z
  .object({
    companyName: z.string().trim().min(2).max(120),
    storeUrl: z.url().refine((url) => url.startsWith('https://')),
    contactEmail: z.email().optional().or(z.literal('')),
    contactChannel: z.enum(['source-platform', 'direct-email']),
    explicitIntentConfirmed: z.literal(true),
  })
  .refine(
    (value) =>
      value.contactChannel !== 'direct-email' || Boolean(value.contactEmail),
    {
      message: 'A direct-email opportunity needs a verified reply address',
      path: ['contactEmail'],
    },
  );

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isOperatorRequest(request))
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = qualifySchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json(
      { error: 'Qualification details are incomplete' },
      { status: 400 },
    );
  const { id } = await context.params;
  const lead = await getLead(id);
  if (!lead || lead.status !== 'discovered')
    return Response.json(
      { error: 'Only a newly discovered lead can be qualified' },
      { status: 409 },
    );
  if (
    parsed.data.contactEmail &&
    (await isSuppressed(parsed.data.contactEmail))
  )
    return Response.json(
      { error: 'This address is suppressed and cannot be drafted' },
      { status: 409 },
    );
  try {
    const preflight = await runStorefrontPreflight(parsed.data.storeUrl, {
      limit: 5,
    });
    const successfulPages = preflight.pages.filter(({ document }) =>
      isSuccessfulStorefrontDocument(document),
    );
    if (!successfulPages.length)
      return Response.json(
        {
          error:
            'The public mobile preflight could not load any successful storefront page',
          attempted: preflight.attemptedRoutes.length,
          failures: preflight.failures,
        },
        { status: 502 },
      );
    const pageFindings = preflight.pages.flatMap(({ requestedUrl, document }) =>
      deriveDeterministicFindings(document).map((finding) => ({
        ...finding,
        url:
          document.metadata?.sourceURL ??
          document.metadata?.url ??
          requestedUrl,
        screenshotUrl: document.screenshot,
        statusCode: document.metadata?.statusCode,
      })),
    );
    const corpusFindings = deriveCorpusFindings(
      preflight.pages.map(({ document }) => document),
    );
    const findings = [...pageFindings, ...corpusFindings];
    const proof = findings[0];
    await markQualified({
      id,
      companyName: parsed.data.companyName,
      storeUrl: parsed.data.storeUrl,
      contactEmail: parsed.data.contactEmail || undefined,
      contactChannel: parsed.data.contactChannel,
      proofUrl: proof?.url ?? preflight.pages[0].requestedUrl,
      proofSummary:
        proof?.evidence ??
        `Public mobile preflight loaded ${successfulPages.length} of ${preflight.attemptedRoutes.length} selected pages successfully; human evidence review required.`,
    });
    for (const finding of findings) {
      await addFinding({
        leadId: id,
        ...finding,
      });
    }
    return Response.json({
      ok: true,
      attempted: preflight.attemptedRoutes.length,
      checked: preflight.pages.length,
      successful: successfulPages.length,
      failures: preflight.failures,
      findings: findings.length,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Preview failed' },
      { status: 502 },
    );
  }
}
