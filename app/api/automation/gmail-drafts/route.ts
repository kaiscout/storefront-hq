import { z } from 'zod';

import { publicConfig } from '@/lib/config';
import {
  getLead,
  listDraftableDirectEmailLeads,
  setLeadNextAction,
  transitionLead,
} from '@/lib/database';
import { buildProposal } from '@/lib/pipeline';
import { hasAutomationSecret } from '@/lib/security';

const gmailDraftBatchLimit = 20;

export async function GET(request: Request) {
  if (!hasAutomationSecret(request))
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const config = publicConfig();
  if (!config.launchReady)
    return Response.json(
      { error: 'Launch setup is incomplete' },
      { status: 503 },
    );
  const leads = await listDraftableDirectEmailLeads(gmailDraftBatchLimit);
  const drafts = leads.map((lead) => ({
    leadId: lead.id,
    to: lead.contact_email,
    ...buildProposal({
      companyName: lead.company_name,
      contactName: lead.contact_name,
      sourceTitle: lead.source_title,
      proofSummary: lead.proof_summary,
      storeUrl: lead.store_url,
      calUrl: config.calUrl,
      operatorName: config.operatorName,
    }),
  }));
  return Response.json({ drafts });
}

const markedSchema = z.object({
  leadIds: z.array(z.uuid()).max(gmailDraftBatchLimit),
});

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
  let marked = 0;
  for (const id of parsed.data.leadIds) {
    const lead = await getLead(id);
    if (!lead) continue;
    if (lead.contact_channel === 'inbound' && lead.status === 'replied') {
      await setLeadNextAction(
        id,
        'Review the consented inbound reply draft before sending',
        ['replied'],
      );
      marked += 1;
    } else if (
      lead.contact_channel === 'direct-email' &&
      lead.status === 'proposal_ready'
    ) {
      await transitionLead(id, 'drafted', {
        nextAction:
          'Review the Gmail draft and send only if channel rules allow',
      });
      marked += 1;
    }
  }
  return Response.json({ ok: true, marked });
}
