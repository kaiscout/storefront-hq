import { z } from 'zod';

import { publicConfig } from '@/lib/config';
import {
  getLead,
  listInvalidGmailDraftLeadIds,
  listDraftableDirectEmailLeads,
  setLeadNextAction,
  transitionLead,
} from '@/lib/database';
import { buildInboundConsultantReply, buildProposal } from '@/lib/pipeline';
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
  const drafts = leads.map((lead) => {
    const message = ['replied', 'booked'].includes(lead.status)
      ? buildInboundConsultantReply({
          companyName: lead.company_name,
          contactName: lead.contact_name,
          storeUrl: lead.store_url,
          latestSubject: lead.latest_message_subject,
          latestMessage: lead.latest_message_excerpt,
          classification: lead.latest_message_classification,
          alreadyBooked: Boolean(lead.has_active_booking),
          calUrl: config.calUrl,
          operatorName: config.operatorName,
        })
      : buildProposal({
          companyName: lead.company_name,
          contactName: lead.contact_name,
          sourceTitle: lead.source_title,
          proofSummary: lead.proof_summary,
          storeUrl: lead.store_url,
          calUrl: config.calUrl,
          operatorName: config.operatorName,
        });
    const hasCompleteSourceIdentity = Boolean(
      lead.latest_message_external_id && lead.latest_message_thread_id,
    );
    const sourceMessageId = hasCompleteSourceIdentity
      ? lead.latest_message_external_id
      : null;
    const sourceThreadId = hasCompleteSourceIdentity
      ? lead.latest_message_thread_id
      : null;
    const sourceTime = lead.latest_message_created_at
      ? new Date(lead.latest_message_created_at).getTime()
      : Number.NaN;
    const isFreshForAutomaticReply =
      Number.isFinite(sourceTime) &&
      sourceTime >= Date.now() - 72 * 60 * 60 * 1000;
    const autoSend =
      ['replied', 'booked'].includes(lead.status) &&
      isFreshForAutomaticReply &&
      hasCompleteSourceIdentity &&
      ['interested', 'question', 'booked', 'website_confirmation'].includes(
        lead.latest_message_classification ?? '',
      );
    return {
      leadId: lead.id,
      to: lead.contact_email,
      sourceMessageId,
      sourceThreadId,
      autoSend,
      ...message,
    };
  });
  return Response.json({ drafts });
}

const markedSchema = z.object({
  leadIds: z.array(z.uuid()).max(gmailDraftBatchLimit),
  pendingLeadIds: z.array(z.uuid()).max(250).optional(),
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
    if (
      ['inbound', 'direct-email'].includes(lead.contact_channel) &&
      ['replied', 'booked'].includes(lead.status)
    ) {
      await setLeadNextAction(
        id,
        lead.status === 'booked'
          ? 'Review the consented inbound reply draft before sending; keep the scheduled fit call and payment decision active'
          : 'Review the consented inbound reply draft before sending',
        ['replied', 'booked'],
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
  const invalidatedLeadIds = await listInvalidGmailDraftLeadIds(
    parsed.data.pendingLeadIds ?? [],
  );
  return Response.json({ ok: true, marked, invalidatedLeadIds });
}
