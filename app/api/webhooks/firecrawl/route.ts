import {
  addFinding,
  advanceLead,
  claimWebhookEvent,
  completeWebhookEvent,
  failWebhookEvent,
  retryFailedAudit,
  setLeadNextAction,
} from '@/lib/database';
import {
  deriveDeterministicFindings,
  type ScrapeDocument,
} from '@/lib/firecrawl';
import { sha256Hex, verifyHexHmac } from '@/lib/security';

type FirecrawlEvent = {
  type: string;
  id: string;
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
  const externalId = await sha256Hex(raw);
  if (!(await claimWebhookEvent('firecrawl', externalId, event.type))) {
    return Response.json({ ok: true, duplicate: true });
  }
  try {
    const leadId = event.metadata?.leadId;
    if (!leadId) {
      await completeWebhookEvent('firecrawl', externalId);
      return Response.json({ ok: true, matched: false });
    } else if (event.type === 'crawl.started') {
      await advanceLead(leadId, 'fulfilling', 'Audit crawl in progress');
    } else if (event.type === 'crawl.page') {
      for (const document of event.data ?? []) {
        const url =
          document.metadata?.sourceURL ?? document.metadata?.url ?? '';
        if (!url) continue;
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
      await setLeadNextAction(
        leadId,
        'Validate findings, select the top 12, and deliver the evidence pack',
        ['fulfilling'],
      );
    } else if (event.type === 'crawl.failed') {
      await retryFailedAudit(
        leadId,
        `Audit crawl failed: ${event.error ?? 'unknown error'}. Review and retry.`,
      );
    }
    await completeWebhookEvent('firecrawl', externalId);
    return Response.json({ ok: true, matched: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Webhook processing failed';
    await failWebhookEvent('firecrawl', externalId, message);
    return Response.json({ error: message }, { status: 500 });
  }
}
