import { getLead } from '@/lib/database';
import { startFullAudit } from '@/lib/firecrawl';
import { isOperatorRequest } from '@/lib/operator-auth';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isOperatorRequest(request))
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await context.params;
  const lead = await getLead(id);
  if (!lead || lead.status !== 'paid' || !lead.store_url) {
    return Response.json(
      {
        error: 'Only a paid lead with a verified store URL can start an audit',
      },
      { status: 409 },
    );
  }
  const origin = process.env.PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (!origin?.startsWith('https://'))
    return Response.json(
      { error: 'PUBLIC_SITE_URL is not configured' },
      { status: 503 },
    );
  try {
    const crawl = await startFullAudit({
      leadId: id,
      storeUrl: lead.store_url,
      webhookUrl: `${origin}/api/webhooks/firecrawl`,
    });
    return Response.json({ ok: true, crawlId: crawl.id });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Audit failed to start',
      },
      { status: 502 },
    );
  }
}
