import { z } from 'zod';
import { hasAutomationSecret } from '@/lib/security';
import { readRequestBodyWithinLimit } from '@/lib/intake';
import {
  claimWebsiteNotifications,
  finishWebsiteNotification,
} from '@/lib/website-database';
import { operatorNotification } from '@/lib/website-forms';
import { businessContactEmail } from '@/lib/contact';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('claim') }).strict(),
  z
    .object({
      action: z.literal('acknowledge'),
      id: z.uuid(),
      claimToken: z.uuid(),
      messageId: z
        .string()
        .regex(/^[a-zA-Z0-9_-]{1,100}$/)
        .nullable(),
    })
    .strict(),
]);
export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'private, no-store' };
  if (!hasAutomationSecret(request))
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers });
  const raw = await readRequestBodyWithinLimit(request, 2048);
  let input: unknown;
  try {
    input = JSON.parse(raw || '');
  } catch {}
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return Response.json(
      { error: 'Invalid request' },
      { status: 400, headers },
    );
  if (parsed.data.action === 'claim') {
    const rows = await claimWebsiteNotifications();
    return Response.json(
      {
        recipient: businessContactEmail,
        notifications: rows.map(operatorNotification),
      },
      { headers },
    );
  }
  const result = await finishWebsiteNotification(
    parsed.data.id,
    parsed.data.claimToken,
    parsed.data.messageId,
  );
  return Response.json({ ok: result }, { status: result ? 200 : 409, headers });
}
