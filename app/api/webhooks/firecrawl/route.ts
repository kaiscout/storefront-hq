import { addFinding, recordWebhookOnce, transitionLead } from '@/lib/database';
import {
  deriveDeterministicFindings,
  type ScrapeDocument,
} from '@/lib/firecrawl';
import { verifyHexHmac } from '@/lib/security';

type FirecrawlEvent = {
  type: string;
  id: string;
  webhookId: string;
  success: boolean;
  error?: string;
  data?: ScrapeDocument[];
  metadata?: { leadId?: string };
};

export async function POST(request: Request) {
  const raw = await request.text();
  const secret = process.env.FIRECRAWL_WEBHOOK_SECRET ?? '';
  if (
    !(await verifyHexHmac(
      secret,
      raw,
      request.headers.get('x-firecrawl-signature'),
    ))
  ) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }
  const event = JSON.parse(raw) as FirecrawlEvent;
  if (!(await recordWebhookOnce('firecrawl', event.webhookId, event.type))) {
    return Response.json({ ok: true, duplicate: true });
  }
  const leadId = event.metadata?.leadId;
  if (!leadId) return Response.json({ ok: true, matched: false });

  if (event.type === 'crawl.started') {
    await transitionLead(leadId, 'fulfilling', {
      force: true,
      nextAction: 'Audit crawl in progress',
    });
  } else if (event.type === 'crawl.page') {
    for (const document of event.data ?? []) {
      const url = document.metadata?.sourceURL ?? document.metadata?.url ?? '';
      for (const finding of deriveDeterministicFindings(document)) {
        await addFinding({
          leadId,
          url,
          ...finding,
          screenshotUrl: document.screenshot,
          statusCode: document.metadata?.statusCode,
        });
      }
    }
  } else if (event.type === 'crawl.completed') {
    await transitionLead(leadId, 'fulfilling', {
      force: true,
      nextAction:
        'Validate findings, select the top 12, and deliver the evidence pack',
    });
  } else if (event.type === 'crawl.failed') {
    await transitionLead(leadId, 'paid', {
      force: true,
      nextAction: `Audit crawl failed: ${event.error ?? 'unknown error'}`,
    });
  }
  return Response.json({ ok: true, matched: true });
}
