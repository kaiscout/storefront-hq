import {
  addFinding,
  listRegressionWatchTargets,
  recordRouteSnapshot,
} from '@/lib/database';
import {
  deriveDeterministicFindings,
  scrapeStorefrontPreview,
  storefrontSnapshot,
} from '@/lib/firecrawl';
import { hasAutomationSecret } from '@/lib/security';

export async function POST(request: Request) {
  if (!hasAutomationSecret(request))
    return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const targets = await listRegressionWatchTargets();
  let checked = 0;
  let changed = 0;
  const failures: Array<{ leadId: string; url: string; error: string }> = [];

  for (const target of targets) {
    const results = await Promise.allSettled(
      target.routes.slice(0, 10).map(async (url) => {
        const document = await scrapeStorefrontPreview(url);
        const snapshot = await recordRouteSnapshot({
          leadId: target.leadId,
          url,
          ...(await storefrontSnapshot(document)),
        });
        checked += 1;
        if (!snapshot.changed) return;
        changed += 1;
        await addFinding({
          leadId: target.leadId,
          url,
          title: 'Monitored storefront route changed',
          severity: 'medium',
          category: 'regression-watch',
          evidence: `${url} changed relative to its previous daily public snapshot. HTTP status changed from ${snapshot.previousStatusCode ?? 'unknown'} to ${document.metadata?.statusCode ?? 'unknown'} or the normalized page/link content changed.`,
          recommendation:
            'Review the current screenshot and route against the approved storefront state before notifying the customer.',
          screenshotUrl: document.screenshot,
          statusCode: document.metadata?.statusCode,
        });
        for (const finding of deriveDeterministicFindings(document)) {
          await addFinding({
            leadId: target.leadId,
            url,
            ...finding,
            screenshotUrl: document.screenshot,
            statusCode: document.metadata?.statusCode,
          });
        }
      }),
    );
    results.forEach((result, index) => {
      if (result.status === 'rejected')
        failures.push({
          leadId: target.leadId,
          url: target.routes[index],
          error:
            result.reason instanceof Error
              ? result.reason.message
              : 'Unknown Firecrawl error',
        });
    });
  }

  return Response.json(
    {
      ok: failures.length === 0,
      leads: targets.length,
      checked,
      changed,
      failures,
    },
    { status: failures.length ? 502 : 200 },
  );
}
