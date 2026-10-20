import { isOperatorRequest } from '@/lib/operator-auth';
import { isSameOriginFormRequest } from '@/lib/website-forms';
import { publicConfig } from '@/lib/config';
import { moderateWebsiteReview } from '@/lib/website-database';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isOperatorRequest(request))
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  if (!isSameOriginFormRequest(request, publicConfig().siteUrl))
    return Response.json({ error: 'Invalid origin' }, { status: 403 });
  const body = await request.formData();
  const status = body.get('status');
  if (
    (status !== 'published' && status !== 'hidden') ||
    (status === 'published' && body.get('checked') !== 'on')
  )
    return Response.json(
      {
        error:
          'Confirm authenticity, public consent and removal of private information before publishing.',
      },
      { status: 400 },
    );
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(id))
    return Response.json({ error: 'Invalid reference' }, { status: 400 });
  const ok = await moderateWebsiteReview(id, status);
  if (!ok)
    return Response.json(
      { error: 'No review with publication permission was found.' },
      { status: 409 },
    );
  return new Response(null, {
    status: 303,
    headers: { Location: '/ops/website', 'Cache-Control': 'no-store' },
  });
}
