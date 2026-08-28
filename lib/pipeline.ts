export const pipelineStatuses = [
  'discovered',
  'qualified',
  'proposal_ready',
  'drafted',
  'replied',
  'booked',
  'paid',
  'fulfilling',
  'delivered',
  'closed_lost',
  'suppressed',
] as const;

export type PipelineStatus = (typeof pipelineStatuses)[number];

export type ReplyClassification =
  | 'interested'
  | 'question'
  | 'not_interested'
  | 'unsubscribe'
  | 'booked'
  | 'out_of_office'
  | 'ambiguous';

export type LeadRecord = {
  id: string;
  company_name: string;
  store_url: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_channel: string;
  source_url: string;
  source_title: string;
  source_excerpt: string | null;
  explicit_intent: number;
  fit_score: number;
  fit_reason: string | null;
  proof_url: string | null;
  proof_summary: string | null;
  status: PipelineStatus;
  next_action: string | null;
  last_contact_at: string | null;
  last_reply_at: string | null;
  booked_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export const allowedTransitions: Record<PipelineStatus, PipelineStatus[]> = {
  discovered: ['qualified', 'closed_lost', 'suppressed'],
  qualified: ['proposal_ready', 'closed_lost', 'suppressed'],
  proposal_ready: ['drafted', 'closed_lost', 'suppressed'],
  drafted: ['replied', 'closed_lost', 'suppressed'],
  replied: ['booked', 'paid', 'closed_lost', 'suppressed'],
  booked: ['paid', 'closed_lost', 'suppressed'],
  paid: ['fulfilling'],
  fulfilling: ['delivered'],
  delivered: [],
  closed_lost: [],
  suppressed: [],
};

export function canTransition(from: PipelineStatus, to: PipelineStatus) {
  return allowedTransitions[from].includes(to);
}

export function classifyReply(text: string): ReplyClassification {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();

  if (
    /\b(unsubscribe|remove me|stop emailing|do not contact|opt[ -]?out)\b/.test(
      normalized,
    )
  ) {
    return 'unsubscribe';
  }
  if (
    /\b(out of (the )?office|automatic reply|auto[- ]?reply|on annual leave)\b/.test(
      normalized,
    )
  ) {
    return 'out_of_office';
  }
  if (
    /\b(booked|scheduled|calendar invite|see you (then|on))\b/.test(normalized)
  ) {
    return 'booked';
  }
  if (
    /\b(not interested|no thanks|no thank you|pass for now|not a fit)\b/.test(
      normalized,
    )
  ) {
    return 'not_interested';
  }
  if (
    /\b(interested|sounds good|let'?s talk|tell me more|available|send (the )?details)\b/.test(
      normalized,
    )
  ) {
    return 'interested';
  }
  if (
    normalized.includes('?') ||
    /\b(how much|what does|can you|could you|timeline|price|cost)\b/.test(
      normalized,
    )
  ) {
    return 'question';
  }
  return 'ambiguous';
}

export function scoreOpportunity(input: {
  title?: string;
  description?: string;
  url?: string;
}) {
  const haystack =
    `${input.title ?? ''} ${input.description ?? ''} ${input.url ?? ''}`.toLowerCase();
  const signals = [
    ['shopify', 20],
    ['qa', 18],
    ['quality assurance', 18],
    ['broken link', 16],
    ['cro', 12],
    ['conversion', 10],
    ['bfcm', 16],
    ['black friday', 16],
    ['speed', 8],
    ['audit', 8],
    ['looking for', 12],
    ['need help', 12],
    ['seeking', 12],
  ] as const;
  const reasons: string[] = [];
  let score = 0;
  for (const [signal, weight] of signals) {
    if (haystack.includes(signal)) {
      score += weight;
      reasons.push(signal);
    }
  }
  return { score: Math.min(100, score), reasons };
}

export function buildProposal(input: {
  companyName: string;
  sourceTitle: string;
  proofSummary?: string | null;
  storeUrl?: string | null;
  calUrl?: string;
  operatorName?: string;
}) {
  const proof = input.proofSummary
    ? `I checked the public storefront and confirmed one concrete issue: ${input.proofSummary}`
    : 'I can begin with a five-page public-storefront preflight before you commit.';
  const booking = input.calUrl
    ? `\n\nIf a short fit check is useful, here is my 20-minute calendar: ${input.calUrl}`
    : '';
  const operatorName = input.operatorName?.trim() || '[OPERATOR NAME]';
  return {
    subject: `48-hour storefront QA for ${input.companyName}`,
    body: `Hello ${input.companyName} team,\n\nI’m responding to your request, “${input.sourceTitle}.” ${proof}\n\nI offer a fixed £895 Shopify QA sprint: up to 250 public pages, 12 reproducible findings with screenshots and fix-ready recommendations, plus 30 days of checks on 10 critical routes. Delivery is within 48 hours. If I cannot produce at least eight actionable issues, I refund the fee.\n\nThere is no backend access, retainer, or implementation upsell.${booking}\n\nBest,\n${operatorName}`,
  };
}
