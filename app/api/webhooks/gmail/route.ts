import { z } from 'zod';

import { recordMessage } from '@/lib/database';
import { hasAutomationSecret } from '@/lib/security';

const payloadSchema = z.object({
  messages: z
    .array(
      z.object({
        externalId: z.string().min(1).max(300),
        threadId: z
          .string()
          .trim()
          .min(1)
          .max(200)
          .regex(/^[a-z0-9_-]+$/i)
          .optional(),
        from: z.email().max(254),
        subject: z.string().max(300).optional(),
        body: z.string().max(20_000),
        receivedAt: z.iso.datetime({ offset: true }).optional(),
      }),
    )
    .max(50),
});

export async function POST(request: Request) {
  if (!hasAutomationSecret(request))
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = payloadSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json({ error: 'Invalid Gmail payload' }, { status: 400 });
  const results = [];
  for (const message of parsed.data.messages)
    results.push(await recordMessage(message));
  return Response.json({ ok: true, results });
}
