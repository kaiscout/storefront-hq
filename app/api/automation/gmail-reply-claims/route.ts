import { z } from 'zod';

import {
  claimCurrentGmailReply,
  releaseGmailReplyClaim,
  validateCurrentGmailReplyClaim,
} from '@/lib/database';
import { hasAutomationSecret } from '@/lib/security';

const identitySchema = z.object({
  leadId: z.uuid(),
  sourceMessageId: z.string().trim().min(1).max(300),
});

const requestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('claim'),
    items: z.array(identitySchema).max(20),
  }),
  z.object({
    action: z.literal('release'),
    items: z.array(identitySchema.extend({ claimToken: z.uuid() })).max(20),
  }),
  z.object({
    action: z.literal('validate'),
    items: z.array(identitySchema.extend({ claimToken: z.uuid() })).max(20),
  }),
]);

export async function POST(request: Request) {
  if (!hasAutomationSecret(request))
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json(
      { error: 'Invalid Gmail reply claim' },
      { status: 400 },
    );

  if (parsed.data.action === 'claim') {
    const results = [];
    for (const item of parsed.data.items) {
      const claim = await claimCurrentGmailReply(item);
      results.push({ ...item, claimed: Boolean(claim), ...claim });
    }
    return Response.json({ ok: true, results });
  }

  if (parsed.data.action === 'validate') {
    const results = [];
    for (const item of parsed.data.items) {
      const valid = await validateCurrentGmailReplyClaim(item);
      results.push({ ...item, valid: Boolean(valid), ...valid });
    }
    return Response.json({ ok: true, results });
  }

  const results = [];
  for (const item of parsed.data.items) {
    const released = await releaseGmailReplyClaim(item);
    results.push({ ...item, released });
  }
  return Response.json({ ok: true, results });
}
