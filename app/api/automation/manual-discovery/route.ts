import { insertDiscoveredOpportunities } from '@/lib/database';
import { assessBuyerIntent } from '@/lib/pipeline';
import { createManualDiscoveryHandler } from '@/lib/manual-discovery';
import { hasAutomationSecret } from '@/lib/security';

export const POST = createManualDiscoveryHandler({
  isAuthorized: hasAutomationSecret,
  assessBuyerIntent,
  insertDiscoveredOpportunities,
});
