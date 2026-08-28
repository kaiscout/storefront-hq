import { z } from 'zod';

import {
  addFinding,
  getLead,
  isSuppressed,
  markQualified,
} from '@/lib/database';
import {
  deriveDeterministicFindings,
  scrapeStorefrontPreview,
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
    const document = await scrapeStorefrontPreview(parsed.data.storeUrl);
    const findings = deriveDeterministicFindings(document);
    const proof = findings[0];
    await markQualified({
      id,
      companyName: parsed.data.companyName,
      storeUrl: parsed.data.storeUrl,
      contactEmail: parsed.data.contactEmail || undefined,
      contactChannel: parsed.data.contactChannel,
      proofUrl:
        document.metadata?.sourceURL ??
        document.metadata?.url ??
        parsed.data.storeUrl,
      proofSummary:
        proof?.evidence ??
        'Public mobile storefront preview completed; human evidence review required.',
    });
    for (const finding of findings) {
      await addFinding({
        leadId: id,
        url: document.metadata?.sourceURL ?? parsed.data.storeUrl,
        ...finding,
        screenshotUrl: document.screenshot,
        statusCode: document.metadata?.statusCode,
      });
    }
    return Response.json({ ok: true, findings: findings.length });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Preview failed' },
      { status: 502 },
    );
  }
}
