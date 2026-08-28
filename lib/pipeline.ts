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
  drafted: ['replied', 'booked', 'closed_lost', 'suppressed'],
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

export type BuyerIntentAssessment = {
  accepted: boolean;
  score: number;
  reasons: string[];
  rejectionReason?:
    | 'invalid-url'
    | 'vendor-page'
    | 'article-or-guide'
    | 'employment-listing'
    | 'not-explicit-request'
    | 'not-storefront-qa-fit'
    | 'stale-request'
    | 'no-permitted-reply-channel';
  contactChannel?: 'source-platform' | 'direct-email';
  contactEmail?: string;
  publishedAt?: string;
  recencyRank: number;
};

const explicitRequestPatterns = [
  /\b(?:looking for|seeking|need(?:ing)?|want(?:ing)?)\s+(?:(?:an?|some)\s+)?(?:help|support|someone|shopify|e-?commerce|storefront|qa|quality assurance|tester|expert|consultant|freelancer|recommendations?)\b/i,
  /\b(?:need|want)\s+(?:my|our|the)\s+(?:shopify|e-?commerce|online store|storefront)\b/i,
  /\bcan (?:anyone|someone) (?:help|recommend)\b/i,
  /\b(?:requesting|accepting|seeking) (?:quotes?|proposals?|bids?)\b/i,
  /\b(?:shopify|e-?commerce|storefront).{0,80}\b(?:qa|tester|audit|help|expert|consultant)\s+(?:needed|required|wanted)\b/i,
];

const storefrontPatterns = [
  /\bshopify\b/i,
  /\be-?commerce\b/i,
  /\bonline store\b/i,
  /\bstorefront\b/i,
];

const qaServicePatterns = [
  /\bqa\b/i,
  /\bquality assurance\b/i,
  /\b(?:website|store|storefront|mobile|checkout)\s+(?:audit|test(?:ing)?|review)\b/i,
  /\b(?:audit|test(?:ing)?|tester)\s+(?:my|our|the|a|an)?\s*(?:shopify|e-?commerce|store|storefront|website)\b/i,
  /\bbroken (?:link|links|navigation|checkout)\b/i,
  /\b(?:conversion|cro|store speed|page speed|performance|mobile (?:bug|bugs|issue|issues))\b/i,
  /\b(?:bfcm|black friday)\b/i,
];

const vendorSignals = [
  /\bour services\b/i,
  /\bwe (?:offer|provide|speciali[sz]e|build|deliver)\b/i,
  /\b(?:book|schedule) (?:a )?(?:demo|consultation|call)\b/i,
  /\bget (?:a )?(?:free )?(?:quote|consultation)\b/i,
  /\bhire (?:us|our team|our agency)\b/i,
  /\bshopify (?:development )?agency\b/i,
  /\bour (?:clients|portfolio|case studies)\b/i,
];

const nonBuyerSignals = [
  /\b(?:i(?:'m| am)|we(?:'re| are))\s+not\s+(?:looking for|seeking|hiring)\b/i,
  /\bnot looking for someone to (?:do|take on|handle)\b/i,
  /\b(?:just|only)\s+(?:looking for|seeking|asking for)\s+(?:advice|guidance|feedback|resources?|workflows?|tips)\b/i,
  /\b(?:not|don't|do not)\s+(?:want|need)\s+(?:an?\s+)?(?:agency|consultant|freelancer|provider|vendor)\b/i,
];

const employmentSignals = [
  /\bfull[- ]time\b/i,
  /\bpart[- ]time\b/i,
  /\bannual salary\b/i,
  /\bemployee benefits\b/i,
  /\bjob description\b/i,
  /\b(?:roles? and )?responsibilities\b/i,
  /\b(?:candidate )?qualifications\b/i,
  /\bapply (?:now|for this (?:job|position|role))\b/i,
  /\bwe(?:'re| are) hiring\b/i,
  /\bpermanent (?:position|role|employment)\b/i,
];

const blockedEmailLocals =
  /^(?:no-?reply|donotreply|privacy|legal|abuse|careers?|jobs?|recruit(?:ing|ment)?|hr)$/i;

function parsePublicHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    if (
      !['http:', 'https:'].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password
    )
      return null;
    return parsed;
  } catch {
    return null;
  }
}

function hostMatches(hostname: string, domain: string) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

export function isReplyableSourcePlatform(value: string) {
  const url = parsePublicHttpUrl(value);
  if (!url) return false;
  const host = url.hostname.toLowerCase();
  const path = url.pathname.toLowerCase();

  if (hostMatches(host, 'reddit.com') || host === 'redd.it')
    return /\/comments\/|^\/r\/[^/]+\/(?:s\/|comments\/)/.test(path);
  if (host === 'community.shopify.com') return path !== '/';
  if (host === 'news.ycombinator.com')
    return path === '/item' && url.searchParams.has('id');
  if (hostMatches(host, 'indiehackers.com')) return /\/post\//.test(path);
  if (hostMatches(host, 'upwork.com'))
    return /\/(?:jobs|freelance-jobs\/apply)\//.test(path);
  if (hostMatches(host, 'freelancer.com')) return /\/projects\//.test(path);
  if (hostMatches(host, 'peopleperhour.com'))
    return /\/freelance-jobs\//.test(path);
  if (hostMatches(host, 'contra.com'))
    return /\/opportunit(?:y|ies)\//.test(path);
  if (hostMatches(host, 'guru.com')) return /\/jobs\//.test(path);
  if (hostMatches(host, 'linkedin.com'))
    return /\/(?:posts|feed\/update)\//.test(path);
  if (host === 'x.com' || hostMatches(host, 'twitter.com'))
    return /\/status\/\d+/.test(path);
  return false;
}

export function extractPublishedReplyEmail(text: string) {
  const emailPattern =
    /[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+/gi;
  for (const match of text.matchAll(emailPattern)) {
    const candidate = match[0].toLowerCase();
    const local = candidate.slice(0, candidate.indexOf('@'));
    if (blockedEmailLocals.test(local)) continue;
    const index = match.index ?? 0;
    const context = text.slice(
      Math.max(0, index - 140),
      index + match[0].length + 80,
    );
    if (
      /mailto:/i.test(context) ||
      /\b(?:email|e-mail|contact|reach|reply)\s+(?:(?:me|us|our team)\s+)?(?:at|via|to|:)?\s*$/i.test(
        context.slice(0, index - Math.max(0, index - 140)),
      ) ||
      /\b(?:email|e-mail)\s+(?:your\s+)?(?:proposals?|quotes?|details|portfolios?|responses?|replies)\s+(?:to|at)\b/i.test(
        context,
      ) ||
      /\b(?:send|submit)\s+(?:your\s+)?(?:proposals?|quotes?|details|portfolios?|responses?|replies)\s+(?:to|at)\b/i.test(
        context,
      )
    )
      return candidate;
  }
  return undefined;
}

function normalizedPublishedDate(value: string | undefined, now: Date) {
  if (!value) return undefined;
  const relative = value.trim().match(/^(\d+)\s+(hours?|days?|weeks?)\s+ago$/i);
  let timestamp: number;
  if (relative) {
    const amount = Number(relative[1]);
    const unit = relative[2].toLowerCase();
    const hours = unit.startsWith('hour')
      ? amount
      : unit.startsWith('day')
        ? amount * 24
        : amount * 24 * 7;
    timestamp = now.getTime() - hours * 60 * 60 * 1000;
  } else {
    timestamp = Date.parse(value);
  }
  if (!Number.isFinite(timestamp)) return undefined;
  return new Date(timestamp).toISOString();
}

function recencyFor(publishedAt: string | undefined, now: Date) {
  if (!publishedAt) return { rank: 0, boost: 0, stale: false };
  const ageDays = (now.getTime() - Date.parse(publishedAt)) / 86_400_000;
  if (ageDays > 31) return { rank: -1, boost: 0, stale: true };
  if (ageDays < -2) return { rank: -1, boost: 0, stale: true };
  if (ageDays <= 2) return { rank: 4, boost: 18, stale: false };
  if (ageDays <= 7) return { rank: 3, boost: 14, stale: false };
  if (ageDays <= 14) return { rank: 2, boost: 8, stale: false };
  return { rank: 1, boost: 3, stale: false };
}

export function assessBuyerIntent(input: {
  title?: string;
  description?: string;
  markdown?: string;
  url: string;
  publishedDate?: string;
  now?: Date;
}): BuyerIntentAssessment {
  const url = parsePublicHttpUrl(input.url);
  if (!url)
    return {
      accepted: false,
      score: 0,
      reasons: [],
      rejectionReason: 'invalid-url',
      recencyRank: -1,
    };

  const title = input.title?.trim() ?? '';
  const text = `${title}\n${input.description ?? ''}\n${input.markdown ?? ''}`;
  const path = url.pathname.toLowerCase();
  const sourcePlatform = isReplyableSourcePlatform(url.href);
  const articlePath =
    /\/(?:blog|articles?|news|guides?|resources?|insights?|learn)(?:\/|$)/.test(
      path,
    );
  const adviceTitle =
    /^(?:how to|guide to|the (?:complete|ultimate) guide|\d+ (?:tips|ways)|best (?:ways|tools|apps)|what is)\b/i.test(
      title,
    );
  if (!sourcePlatform && (articlePath || adviceTitle))
    return {
      accepted: false,
      score: 0,
      reasons: [],
      rejectionReason: 'article-or-guide',
      recencyRank: -1,
    };

  const vendorPath =
    /\/(?:services?|solutions?|products?|pricing|case-studies|shopify-(?:development|agency))(?:\/|$)/.test(
      path,
    );
  const vendorCount = vendorSignals.filter((pattern) =>
    pattern.test(text),
  ).length;
  if ((!sourcePlatform && vendorPath) || vendorCount >= 2)
    return {
      accepted: false,
      score: 0,
      reasons: [],
      rejectionReason: 'vendor-page',
      recencyRank: -1,
    };

  if (nonBuyerSignals.some((pattern) => pattern.test(text)))
    return {
      accepted: false,
      score: 0,
      reasons: [],
      rejectionReason: 'not-explicit-request',
      recencyRank: -1,
    };

  const employmentHost = [
    'indeed.com',
    'glassdoor.com',
    'ziprecruiter.com',
    'monster.com',
    'reed.co.uk',
    'totaljobs.com',
    'workable.com',
    'greenhouse.io',
    'lever.co',
    'smartrecruiters.com',
  ].some((domain) => hostMatches(url.hostname.toLowerCase(), domain));
  const employmentPath =
    employmentHost ||
    (!sourcePlatform &&
      /\/(?:jobs?|careers?|vacancies|open-positions|job-openings)(?:\/|$)/.test(
        path,
      ));
  const employmentCount = employmentSignals.filter((pattern) =>
    pattern.test(text),
  ).length;
  if (employmentPath || employmentCount >= 2)
    return {
      accepted: false,
      score: 0,
      reasons: [],
      rejectionReason: 'employment-listing',
      recencyRank: -1,
    };

  if (!explicitRequestPatterns.some((pattern) => pattern.test(text)))
    return {
      accepted: false,
      score: 0,
      reasons: [],
      rejectionReason: 'not-explicit-request',
      recencyRank: -1,
    };
  if (
    !storefrontPatterns.some((pattern) => pattern.test(text)) ||
    !qaServicePatterns.some((pattern) => pattern.test(text))
  )
    return {
      accepted: false,
      score: 0,
      reasons: [],
      rejectionReason: 'not-storefront-qa-fit',
      recencyRank: -1,
    };

  const contactEmail = extractPublishedReplyEmail(text);
  if (!sourcePlatform && !contactEmail)
    return {
      accepted: false,
      score: 0,
      reasons: [],
      rejectionReason: 'no-permitted-reply-channel',
      recencyRank: -1,
    };

  const now = input.now ?? new Date();
  const publishedAt = normalizedPublishedDate(input.publishedDate, now);
  const recency = recencyFor(publishedAt, now);
  if (recency.stale)
    return {
      accepted: false,
      score: 0,
      reasons: [],
      rejectionReason: 'stale-request',
      publishedAt,
      recencyRank: recency.rank,
    };

  const base = scoreOpportunity({
    title,
    description: `${input.description ?? ''} ${input.markdown ?? ''}`,
    url: url.href,
  });
  const reasons = [
    ...base.reasons,
    'explicit request',
    sourcePlatform ? 'source-platform reply' : 'published reply email',
  ];
  if (recency.rank > 0) reasons.push('recently published');
  return {
    accepted: true,
    score: Math.min(100, base.score + 20 + recency.boost),
    reasons: [...new Set(reasons)],
    contactChannel: sourcePlatform ? 'source-platform' : 'direct-email',
    contactEmail: sourcePlatform ? undefined : contactEmail,
    publishedAt,
    recencyRank: recency.rank,
  };
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
