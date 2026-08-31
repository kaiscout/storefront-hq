import { z } from 'zod';

import { recordGmailDraftThreadLink } from '@/lib/database';
import { hasAutomationSecret } from '@/lib/security';

const draftThreadSchema = z.object({
  leadId: z.uuid(),
  threadId: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9_-]+$/i),
  draftId: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9_-]+$/i),
});

export async function POST(request: Request) {
  if (!hasAutomationSecret(request))
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = draftThreadSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json(
      { error: 'Invalid Gmail draft link' },
      { status: 400 },
    );
  try {
    return Response.json({
      ok: true,
      ...(await recordGmailDraftThreadLink(parsed.data)),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Gmail draft was not linked';
    return Response.json(
      { error: message },
      { status: message === 'Lead not found' ? 404 : 409 },
    );
  }
}
