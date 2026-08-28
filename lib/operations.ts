import { offer } from './offer.ts';
import type { PipelineStatus } from './pipeline.ts';

export const DELIVERY_SLA_HOURS = offer.deliveryHours;
export const SLA_APPROACHING_WINDOW_HOURS = 12;
export const UNQUALIFIED_RESEARCH_RETENTION_DAYS = 30;
export const UNSUCCESSFUL_LEAD_RETENTION_DAYS = 90;

export const activeSourcePlatformStatuses = [
  'discovered',
  'qualified',
  'proposal_ready',
  'drafted',
  'replied',
  'booked',
] as const satisfies readonly PipelineStatus[];

export const unsuccessfulLeadStatuses = [
  'qualified',
  'proposal_ready',
  'drafted',
  'replied',
  'booked',
  'closed_lost',
  'suppressed',
] as const satisfies readonly PipelineStatus[];

export type DeliverySlaState = 'on_track' | 'approaching' | 'overdue';

function utcTimestamp(value: string) {
  const trimmed = value.trim();
  const normalized = /(?:z|[+-]\d\d:\d\d)$/i.test(trimmed)
    ? trimmed
    : `${trimmed.replace(' ', 'T')}Z`;
  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function deliverySlaSummary(paidAt: string, now = new Date()) {
  const paidTimestamp = utcTimestamp(paidAt);
  if (paidTimestamp === null || !Number.isFinite(now.getTime())) return null;
  const dueTimestamp = paidTimestamp + DELIVERY_SLA_HOURS * 60 * 60 * 1000;
  const remainingMilliseconds = dueTimestamp - now.getTime();
  const approachingMilliseconds = SLA_APPROACHING_WINDOW_HOURS * 60 * 60 * 1000;
  const state: DeliverySlaState =
    remainingMilliseconds <= 0
      ? 'overdue'
      : remainingMilliseconds <= approachingMilliseconds
        ? 'approaching'
        : 'on_track';
  return {
    state,
    paidAt: new Date(paidTimestamp).toISOString(),
    dueAt: new Date(dueTimestamp).toISOString(),
    hoursRemaining:
      Math.round((remainingMilliseconds / (60 * 60 * 1000)) * 10) / 10,
  };
}

export function automatedSlaNextAction(
  summary: NonNullable<ReturnType<typeof deliverySlaSummary>>,
) {
  return summary.state === 'overdue'
    ? `[SLA] Delivery overdue since ${summary.dueAt}; prioritize completion and operator review`
    : `[SLA] Delivery due by ${summary.dueAt}; confirm the audit is on track`;
}

type RetentionCandidate = {
  status: PipelineStatus;
  explicitIntent: boolean;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RetentionDisposition =
  | 'keep'
  | 'delete_unqualified_research'
  | 'delete_unsuccessful_lead';

export function retentionDisposition(
  candidate: RetentionCandidate,
  now = new Date(),
): RetentionDisposition {
  if (candidate.paidAt) return 'keep';
  if (['paid', 'fulfilling', 'delivered'].includes(candidate.status))
    return 'keep';

  const createdAt = utcTimestamp(candidate.createdAt);
  const updatedAt = utcTimestamp(candidate.updatedAt);
  if (
    createdAt === null ||
    updatedAt === null ||
    !Number.isFinite(now.getTime())
  )
    return 'keep';

  const day = 24 * 60 * 60 * 1000;
  if (
    candidate.status === 'discovered' &&
    !candidate.explicitIntent &&
    now.getTime() - createdAt >= UNQUALIFIED_RESEARCH_RETENTION_DAYS * day
  )
    return 'delete_unqualified_research';

  if (
    unsuccessfulLeadStatuses.includes(
      candidate.status as (typeof unsuccessfulLeadStatuses)[number],
    ) &&
    now.getTime() - updatedAt >= UNSUCCESSFUL_LEAD_RETENTION_DAYS * day
  )
    return 'delete_unsuccessful_lead';

  return 'keep';
}
