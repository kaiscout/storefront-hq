import { publicConfig } from '@/lib/config';
import { readRequestBodyWithinLimit } from '@/lib/intake';
import {
  consumeWebsiteFormLimit,
  saveWebsiteSubmission,
} from '@/lib/website-database';
import {
  isSameOriginFormRequest,
  sha256,
  websiteFormSchema,
} from '@/lib/website-forms';

const reply = (body: object, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      ...(status === 429 ? { 'Retry-After': '3600' } : {}),
    },
  });

export async function POST(request: Request) {
  const config = publicConfig();
  if (!config.intakeReady)
    return reply(
      {
        error: 'The form is temporarily unavailable. Please email us directly.',
      },
      503,
    );
  if (!isSameOriginFormRequest(request, config.siteUrl))
    return reply(
      { error: 'Please submit from the Storefront HQ website.' },
      403,
    );
  if (
    !request.headers
      .get('content-type')
      ?.toLowerCase()
      .startsWith('application/json')
  )
    return reply({ error: 'Use the website form.' }, 415);
  const raw = await readRequestBodyWithinLimit(request, 16 * 1024);
  if (raw === null) return reply({ error: 'Your message is too long.' }, 413);
  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    return reply({ error: 'Please check the form.' }, 400);
  }
  const parsed = websiteFormSchema.safeParse(input);
  if (!parsed.success)
    return reply(
      { error: parsed.error.issues[0]?.message || 'Please check the form.' },
      400,
    );
  if (parsed.data.website)
    return reply({ ok: true, id: parsed.data.submissionKey });
  try {
    const identifier = await sha256(
      `website-form|${request.headers.get('cf-connecting-ip') || 'unknown'}`,
    );
    if (
      !(await consumeWebsiteFormLimit(identifier, 5)) ||
      !(await consumeWebsiteFormLimit('global', 50))
    )
      return reply(
        { error: 'Too many submissions. Please try again later or email us.' },
        429,
      );
    if (!(await saveWebsiteSubmission(parsed.data)))
      return reply(
        {
          error:
            'This submission reference has already been used. Reload the page to start a new message.',
        },
        409,
      );
    return reply({
      ok: true,
      id: parsed.data.submissionKey,
      delivery: 'queued',
    });
  } catch (error) {
    console.error(
      'Website submission could not be saved',
      error instanceof Error ? error.name : 'Unknown error',
    );
    return reply(
      {
        error:
          'We could not confirm receipt. Your form is still here; please retry or email us directly.',
      },
      503,
    );
  }
}
