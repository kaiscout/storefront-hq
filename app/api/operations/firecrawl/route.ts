import { refreshFirecrawlCreditStatus } from '@/lib/firecrawl-budget';
import { isOperatorRequest } from '@/lib/operator-auth';
import { hasAutomationSecret } from '@/lib/security';

export async function GET(request: Request) {
  if (!isOperatorRequest(request) && !hasAutomationSecret(request))
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return Response.json(
      { ok: true, ...(await refreshFirecrawlCreditStatus()) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Credit check failed',
      },
      { status: 502 },
    );
  }
}
