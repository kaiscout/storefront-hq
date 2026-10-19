import { d1 } from '@/lib/database';
import {
  canPublishReview,
  formFingerprint,
  type PublicReview,
  type SubmissionRow,
  type WebsiteForm,
} from '@/lib/website-forms';
import {
  websiteRateLimitSql,
  publicReviewsSql,
  claimWebsiteNotificationsSql,
} from '@/lib/website-sql';

// These tables are migration-owned; never create/alter them during a request.
export async function saveWebsiteSubmission(form: WebsiteForm) {
  const fingerprint = await formFingerprint(form);
  await d1()
    .prepare(
      `INSERT INTO website_submissions (id, fingerprint, kind, contact_name, contact_email, company, store_url, topic, product_id, message, rating, display_name, publish_consent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`,
    )
    .bind(
      form.submissionKey,
      fingerprint,
      form.kind,
      form.contactName,
      form.contactEmail,
      form.company || null,
      form.storeUrl || null,
      form.topic,
      form.productId || null,
      form.message,
      form.kind === 'review' ? form.rating : null,
      form.kind === 'review' ? form.displayName || null : null,
      form.kind === 'review' && form.publishConsent ? 1 : 0,
    )
    .run();
  const saved = await d1()
    .prepare('SELECT fingerprint FROM website_submissions WHERE id = ?')
    .bind(form.submissionKey)
    .first<{ fingerprint: string }>();
  return saved?.fingerprint === fingerprint;
}

export async function consumeWebsiteFormLimit(
  identifier: string,
  maximum: number,
) {
  const now = Math.floor(Date.now() / 1000);
  const result = await d1()
    .prepare(websiteRateLimitSql)
    .bind(identifier, now, now - 3600, now - 3600)
    .first<{ attempts: number }>();
  return !!result && result.attempts <= maximum;
}

export async function listWebsiteSubmissions() {
  const result = await d1()
    .prepare(
      'SELECT * FROM website_submissions ORDER BY created_at DESC LIMIT 100',
    )
    .all<SubmissionRow>();
  return result.results;
}
export async function listPublicReviews() {
  const result = await d1().prepare(publicReviewsSql).all<PublicReview>();
  return result.results;
}
export async function moderateWebsiteReview(
  id: string,
  status: 'published' | 'hidden',
) {
  const row = await d1()
    .prepare('SELECT * FROM website_submissions WHERE id = ? AND kind = ?')
    .bind(id, 'review')
    .first<SubmissionRow>();
  if (!row || (status === 'published' && !canPublishReview(row))) return false;
  await d1()
    .prepare(
      "UPDATE website_submissions SET moderation_status = ?, updated_at = datetime('now') WHERE id = ?",
    )
    .bind(status, id)
    .run();
  return true;
}
export async function claimWebsiteNotifications() {
  const token = crypto.randomUUID();
  // A stale lease is uncertain, not safe to auto-send again after a network loss.
  await d1()
    .prepare(
      "UPDATE website_submissions SET notification_state = 'uncertain', updated_at = datetime('now') WHERE notification_state = 'sending' AND notification_claimed_at < datetime('now', '-15 minutes')",
    )
    .run();
  const result = await d1()
    .prepare(claimWebsiteNotificationsSql)
    .bind(token)
    .all<SubmissionRow>();
  return result.results;
}
export async function finishWebsiteNotification(
  id: string,
  token: string,
  messageId: string | null,
) {
  const result = await d1()
    .prepare(
      "UPDATE website_submissions SET notification_state = ?, notification_message_id = ?, updated_at = datetime('now') WHERE id = ? AND notification_claim = ? AND notification_state IN ('sending', 'uncertain') RETURNING id",
    )
    .bind(messageId ? 'sent' : 'uncertain', messageId, id, token)
    .first();
  return !!result;
}
export async function pruneWebsiteSubmissions() {
  await d1().batch([
    d1().prepare(
      "DELETE FROM website_submissions WHERE moderation_status != 'published' AND created_at < datetime('now', '-90 days')",
    ),
    d1()
      .prepare('DELETE FROM website_form_limits WHERE window_started_at < ?')
      .bind(Math.floor(Date.now() / 1000) - 86400),
  ]);
}
