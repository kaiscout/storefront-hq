import { z } from 'zod';

import { listLeads, transitionLead } from '@/lib/database';
import { buildProposal } from '@/lib/pipeline';
import { hasAutomationSecret } from '@/lib/security';

export async function GET(request: Request) {
  if (!hasAutomationSecret(request))
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const leads = await listLeads(250);
  const calUrl = process.env.CAL_BOOKING_URL;
  const drafts = leads
    .filter(
      (lead) =>
        lead.status === 'proposal_ready' &&
        lead.explicit_intent === 1 &&
        lead.contact_email &&
        lead.contact_channel === 'direct-email',
    )
    .map((lead) => ({
      leadId: lead.id,
      to: lead.contact_email,
      ...buildProposal({
        companyName: lead.company_name,
        sourceTitle: lead.source_title,
        proofSummary: lead.proof_summary,
        storeUrl: lead.store_url,
        calUrl,
        operatorName: process.env.PUBLIC_OPERATOR_NAME,
      }),
    }));
  return Response.json({ drafts });
}

const markedSchema = z.object({ leadIds: z.array(z.uuid()).max(50) });

export async function POST(request: Request) {
  if (!hasAutomationSecret(request))
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
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
