import { z } from 'zod';

import { addFinding, getLead } from '@/lib/database';
import { isOperatorRequest } from '@/lib/operator-auth';

const findingSchema = z.object({
  url: z.url().refine((value) => value.startsWith('https://')),
  title: z.string().trim().min(5).max(180),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  category: z.string().trim().min(2).max(80),
  evidence: z.string().trim().min(20).max(4_000),
  recommendation: z.string().trim().min(10).max(4_000),
  screenshotUrl: z
    .url()
    .refine((value) => value.startsWith('https://'))
    .optional()
    .or(z.literal('')),
  statusCode: z.number().int().min(100).max(599).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isOperatorRequest(request))
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = findingSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json(
      {
        error:
          'Provide complete, reproducible evidence and a fix-ready recommendation',
      },
      { status: 400 },
    );

  const { id } = await context.params;
  const lead = await getLead(id);
  if (!lead?.store_url || !['paid', 'fulfilling'].includes(lead.status))
    return Response.json(
      { error: 'Verified findings can be added only to an active paid audit' },
      { status: 409 },
    );
  if (new URL(parsed.data.url).origin !== new URL(lead.store_url).origin)
    return Response.json(
      { error: 'The affected URL must use the verified storefront origin' },
      { status: 400 },
    );

  const result = await addFinding({
    leadId: id,
    url: parsed.data.url,
    title: parsed.data.title,
    severity: parsed.data.severity,
    category: parsed.data.category,
    evidence: parsed.data.evidence,
    recommendation: parsed.data.recommendation,
    screenshotUrl: parsed.data.screenshotUrl || undefined,
    statusCode: parsed.data.statusCode,
  });
  return Response.json({ ok: true, ...result });
}
