import { getLead, listFindings, listWatchRoutes } from '@/lib/database';
import { isOperatorRequest } from '@/lib/operator-auth';
import {
  evidencePackCsv,
  sortEvidenceFindings,
  toEvidenceFindings,
} from '@/lib/report';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isOperatorRequest(request))
    return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;
  const lead = await getLead(id);
  if (!lead) return Response.json({ error: 'Lead not found' }, { status: 404 });
  if (!['paid', 'fulfilling', 'delivered'].includes(lead.status))
    return Response.json(
      { error: 'Evidence packs are available only after payment' },
      { status: 409 },
    );

  const [findingRows, watchRoutes] = await Promise.all([
    listFindings(id),
    listWatchRoutes(),
  ]);
  const findings = toEvidenceFindings(findingRows);
  const routes = watchRoutes
    .filter((row) => row.lead_id === id)
    .map((row) => row.url);
  const format = new URL(request.url).searchParams.get('format') ?? 'json';

  if (format === 'csv') {
    const csv = evidencePackCsv({
      companyName: lead.company_name,
      storeUrl: lead.store_url,
      findings,
    });
    const filename = `${
      lead.company_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'storefront'
    }-evidence.csv`;
    return new Response(`\uFEFF${csv}`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  }

  return Response.json(
    {
      lead: {
        id: lead.id,
        companyName: lead.company_name,
        storeUrl: lead.store_url,
        paidAt: lead.paid_at,
        status: lead.status,
      },
      findings: sortEvidenceFindings(findings),
      watchRoutes: routes,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
