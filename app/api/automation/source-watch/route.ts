import {
  listActiveSourcePlatformTargets,
  recordRouteSnapshot,
} from '@/lib/database';
import { scrapeStorefrontPreview, storefrontSnapshot } from '@/lib/firecrawl';
import { isReplyableSourcePlatform } from '@/lib/pipeline';
import { hasAutomationSecret } from '@/lib/security';

export async function POST(request: Request) {
  if (!hasAutomationSecret(request))
    return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const targets = await listActiveSourcePlatformTargets();
  const changed: Array<Record<string, unknown>> = [];
  const failures: Array<{ leadId: string; url: string; error: string }> = [];
  let checked = 0;
  let baselines = 0;
  for (const target of targets) {
    if (!isReplyableSourcePlatform(target.url)) {
      failures.push({
        leadId: target.leadId,
        url: target.url,
        error: 'Stored URL is not an approved public source-platform URL',
      });
      continue;
    }
    try {
      const document = await scrapeStorefrontPreview(target.url);
      const current = await storefrontSnapshot(document);
      const snapshot = await recordRouteSnapshot({
        leadId: target.leadId,
        url: target.url,
        ...current,
      });
      if (!snapshot.tracked) {
        failures.push({
          leadId: target.leadId,
          url: target.url,
          error: 'Snapshot limit reached for this lead',
        });
        continue;
      }
      checked += 1;
      if (snapshot.baseline) baselines += 1;
      if (snapshot.changed)
        changed.push({
          leadId: target.leadId,
          url: target.url,
          status: target.status,
          previousStatusCode: snapshot.previousStatusCode,
          currentStatusCode: current.statusCode ?? null,
          summary:
            'The publicly accessible response changed relative to its prior snapshot; review it on the source platform.',
        });
    } catch (error) {
      failures.push({
        leadId: target.leadId,
        url: target.url,
        error:
          error instanceof Error
            ? error.message
            : 'Public snapshot could not be captured',
      });
    }
  }

  return Response.json(
    {
      ok: failures.length === 0,
      scope:
        'Publicly accessible responses only; authenticated or login-gated content is not requested.',
      targets: targets.length,
      checked,
      baselines,
      changed,
      failures,
    },
    { status: failures.length ? 502 : 200 },
  );
}
