import { z } from 'zod';

import { confirmWebsiteIntakeFromGmail } from '@/lib/database';
import { hasAutomationSecret } from '@/lib/security';

const confirmationBatchSchema = z.object({
  messages: z
    .array(
      z.object({
        externalId: z
          .string()
          .trim()
          .min(1)
          .max(200)
          .regex(/^[a-z0-9_-]+$/i),
        threadId: z
          .string()
          .trim()
          .min(1)
          .max(200)
          .regex(/^[a-z0-9_-]+$/i)
          .optional(),
        from: z.email().max(254),
        subject: z.string().min(1).max(300),
        body: z.string().max(20_000),
        receivedAt: z.iso.datetime({ offset: true }).optional(),
      }),
    )
    .max(50),
});

export async function POST(request: Request) {
  if (!hasAutomationSecret(request))
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = confirmationBatchSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json(
      { error: 'Invalid Gmail confirmation payload' },
      { status: 400 },
    );
  const results = [];
  for (const message of parsed.data.messages)
    results.push(await confirmWebsiteIntakeFromGmail(message));
  return Response.json({ ok: true, results });
}
