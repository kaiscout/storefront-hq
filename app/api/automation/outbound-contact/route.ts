import { z } from 'zod';

import { recordOutboundContact } from '@/lib/database';
import { hasAutomationSecret } from '@/lib/security';

const sentContactSchema = z.object({
  leadId: z.uuid(),
  threadId: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9_-]+$/i),
  sentMessageId: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9_-]+$/i),
  sentAt: z.iso.datetime({ offset: true }),
  subject: z.string().trim().max(300).optional(),
});

export async function POST(request: Request) {
  if (!hasAutomationSecret(request))
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = sentContactSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json(
      { error: 'Invalid sent-contact record' },
      { status: 400 },
    );
  try {
    return Response.json({
      ok: true,
      ...(await recordOutboundContact(parsed.data)),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Outbound contact was not recorded';
    return Response.json(
      { error: message },
      { status: message === 'Lead not found' ? 404 : 409 },
    );
  }
}
