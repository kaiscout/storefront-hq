import { insertDiscoveredOpportunities } from '@/lib/database';
import { discoverExplicitIntent } from '@/lib/firecrawl';
import { hasAutomationSecret } from '@/lib/security';
import { FirecrawlDeferred } from '@/lib/firecrawl-budget';

export async function POST(request: Request) {
  if (!hasAutomationSecret(request))
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const opportunities = await discoverExplicitIntent();
    const saved = await insertDiscoveredOpportunities(opportunities);
    return Response.json({ ok: true, found: opportunities.length, saved });
  } catch (error) {
    if (error instanceof FirecrawlDeferred)
      return Response.json({
        ok: true,
        deferred: true,
        reason: error.message,
        nextEligibleAt: error.nextEligibleAt,
        found: 0,
        saved: 0,
      });
    return Response.json(
      { error: error instanceof Error ? error.message : 'Discovery failed' },
      { status: 502 },
    );
  }
}
