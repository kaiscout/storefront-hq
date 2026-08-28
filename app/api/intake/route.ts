import { z } from 'zod';

import { publicConfig } from '@/lib/config';
import { createInboundLead } from '@/lib/database';

const intakeSchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  contactName: z.string().trim().min(2).max(120),
  contactEmail: z.email().trim().max(254),
  storeUrl: z
    .url()
    .trim()
    .max(500)
    .refine((value) => value.startsWith('https://'), 'Use an HTTPS store URL'),
  consent: z.literal(true),
  website: z.string().max(0).optional(),
});

async function inboundKey(email: string, storeUrl: string) {
  const bytes = new TextEncoder().encode(
    `${email.toLowerCase()}|${new URL(storeUrl).hostname.toLowerCase()}`,
  );
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  return `inbound:${hex}`;
}

export async function POST(request: Request) {
  const config = publicConfig();
  if (!config.launchReady) {
    return Response.json(
      { error: 'Intake is closed until the operator identity is configured.' },
      { status: 503 },
    );
  }
  const parsed = intakeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: 'Please check the form fields.' },
      { status: 400 },
    );
  }
  if (parsed.data.website) return Response.json({ ok: true });
  const id = await createInboundLead({
    ...parsed.data,
    sourceUrl: await inboundKey(parsed.data.contactEmail, parsed.data.storeUrl),
  });
  return Response.json({ ok: true, id, bookingUrl: config.calUrl || null });
}
