import { insertDiscoveredOpportunities } from '@/lib/database';
import { discoverExplicitIntent } from '@/lib/firecrawl';
import { hasAutomationSecret } from '@/lib/security';

export async function POST(request: Request) {
  if (!hasAutomationSecret(request))
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const opportunities = await discoverExplicitIntent();
    const saved = await insertDiscoveredOpportunities(opportunities);
    return Response.json({ ok: true, found: opportunities.length, saved });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Discovery failed' },
      { status: 502 },
    );
  }
}
