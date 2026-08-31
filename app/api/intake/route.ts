import { z } from 'zod';

import { publicConfig } from '@/lib/config';
import { consumePublicIntakeAttempt, createInboundLead } from '@/lib/database';
import {
  intakeRateLimitKey,
  isPublicHttpsStoreUrl,
  normalizedSingleLine,
  readRequestBodyWithinLimit,
} from '@/lib/intake';

const intakeSchema = z
  .object({
    companyName: z
      .string()
      .transform(normalizedSingleLine)
      .pipe(z.string().min(2).max(120)),
    contactName: z
      .string()
      .transform(normalizedSingleLine)
      .pipe(z.string().min(2).max(120)),
    contactEmail: z.string().trim().toLowerCase().pipe(z.email().max(254)),
    storeUrl: z
      .url()
      .trim()
      .max(500)
      .refine(isPublicHttpsStoreUrl, 'Use a public HTTPS store URL')
      .transform((value) => new URL(value).origin),
    consent: z.literal(true),
    website: z.string().max(500).optional(),
  })
  .strict();

const maximumIntakeBodyBytes = 8 * 1024;

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
  if (
    !request.headers
      .get('content-type')
      ?.toLowerCase()
      .startsWith('application/json')
  )
    return Response.json(
      { error: 'Use application/json.' },
      { status: 415, headers: { 'Cache-Control': 'no-store' } },
    );
  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > maximumIntakeBodyBytes
  )
    return Response.json(
      { error: 'Request is too large.' },
      { status: 413, headers: { 'Cache-Control': 'no-store' } },
    );
  const rawBody = await readRequestBodyWithinLimit(
    request,
    maximumIntakeBodyBytes,
  );
  if (rawBody === null)
    return Response.json(
      { error: 'Request is too large.' },
      { status: 413, headers: { 'Cache-Control': 'no-store' } },
    );
  let body: unknown = null;
  try {
    body = JSON.parse(rawBody);
  } catch {}
  const parsed = intakeSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Please check the form fields.' },
      { status: 400 },
    );
  }
  if (parsed.data.website)
    return Response.json(
      { ok: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  const sourceRateLimit = await consumePublicIntakeAttempt(
    await intakeRateLimitKey(request),
  );
  if (!sourceRateLimit.allowed)
    return Response.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Cache-Control': 'no-store',
          'Retry-After': String(sourceRateLimit.retryAfterSeconds),
        },
      },
    );
  const globalRateLimit = await consumePublicIntakeAttempt(
    'intake-rate:global',
    30,
  );
  if (!globalRateLimit.allowed)
    return Response.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Cache-Control': 'no-store',
          'Retry-After': String(globalRateLimit.retryAfterSeconds),
        },
      },
    );
  const id = await createInboundLead({
    ...parsed.data,
    sourceUrl: await inboundKey(parsed.data.contactEmail, parsed.data.storeUrl),
  });
  return Response.json(
    { ok: true, id, bookingUrl: config.calUrl || null },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
