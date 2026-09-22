import {
  addFinding,
  advanceLead,
  claimWebhookEvent,
  completeWebhookEvent,
  failWebhookEvent,
  recordAuditPages,
  retryFailedAudit,
  setLeadNextAction,
} from '@/lib/database';
import {
  auditPageEvidence,
  deriveCorpusFindings,
  deriveDeterministicFindings,
  getCrawl,
  type ScrapeDocument,
} from '@/lib/firecrawl';
import { sha256Hex, verifyHexHmac } from '@/lib/security';
import { releaseFailedCrawl } from '@/lib/firecrawl-budget';

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
      await recordAuditPages(
        (event.data ?? [])
          .map((document) => auditPageEvidence(document))
          .filter((page): page is NonNullable<typeof page> => page !== null)
          .map((page) => ({ leadId, ...page })),
      );
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
      let documents = event.data ?? [];
      if (!documents.length) documents = (await getCrawl(event.id)).data ?? [];
      await recordAuditPages(
        documents
          .map((document) => auditPageEvidence(document))
          .filter((page): page is NonNullable<typeof page> => page !== null)
          .map((page) => ({ leadId, ...page })),
      );
      for (const document of documents) {
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
      for (const finding of deriveCorpusFindings(documents)) {
        await addFinding({ leadId, ...finding });
      }
      await setLeadNextAction(
        leadId,
        'Validate findings, select the top 12, and deliver the evidence pack',
        ['fulfilling'],
      );
    } else if (event.type === 'crawl.failed') {
      await releaseFailedCrawl(leadId, event.id);
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
