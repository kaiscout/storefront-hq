import { z } from 'zod';

import { publicConfig } from '@/lib/config';
import { listDraftableDirectEmailLeads, transitionLead } from '@/lib/database';
import { offer } from '@/lib/offer';
import { buildProposal } from '@/lib/pipeline';
import { hasAutomationSecret } from '@/lib/security';

export async function GET(request: Request) {
  if (!hasAutomationSecret(request))
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const config = publicConfig();
  if (!config.launchReady)
    return Response.json(
      { error: 'Launch setup is incomplete' },
      { status: 503 },
    );
  const leads = await listDraftableDirectEmailLeads(offer.pageLimit);
  const drafts = leads.map((lead) => ({
    leadId: lead.id,
    to: lead.contact_email,
    ...buildProposal({
      companyName: lead.company_name,
      sourceTitle: lead.source_title,
      proofSummary: lead.proof_summary,
      storeUrl: lead.store_url,
      calUrl: config.calUrl,
      operatorName: config.operatorName,
    }),
  }));
  return Response.json({ drafts });
}

const markedSchema = z.object({ leadIds: z.array(z.uuid()).max(50) });

export async function POST(request: Request) {
  if (!hasAutomationSecret(request))
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!publicConfig().launchReady)
    return Response.json(
      { error: 'Launch setup is incomplete' },
      { status: 503 },
    );
  const parsed = markedSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: 'Invalid lead list' }, { status: 400 });
  for (const id of parsed.data.leadIds) {
    await transitionLead(id, 'drafted', {
      nextAction: 'Review the Gmail draft and send only if channel rules allow',
    });
  }
  return Response.json({ ok: true, marked: parsed.data.leadIds.length });
}
