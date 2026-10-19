import Link from 'next/link';
import { currentOperator } from '@/lib/operator-auth';
import { listWebsiteSubmissions } from '@/lib/website-database';
import { canPublishReview } from '@/lib/website-forms';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Website inbox | Storefront HQ',
  robots: { index: false, follow: false },
};
export default async function WebsiteInbox() {
  if (!(await currentOperator()).authorized)
    return (
      <main className="site-container py-20">
        <h1 className="text-3xl font-bold">Private website inbox</h1>
        <p className="mt-4">
          Only the allowlisted operator can read submissions or moderate
          reviews.
        </p>
        <a
          href="/signin-with-chatgpt?return_to=/ops/website"
          target="_top"
          className="button-primary mt-6"
        >
          Sign in with ChatGPT
        </a>
      </main>
    );
  const rows = await listWebsiteSubmissions();
  return (
    <main className="site-container space-y-8 py-12">
      <Link href="/ops" className="text-sm underline">
        ← Control room
      </Link>
      <div>
        <p className="eyebrow">Private operator workspace</p>
        <h1 className="mt-3 text-4xl font-extrabold">
          Website inbox & review moderation
        </h1>
        <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">
          Entered email addresses are unverified. Do not auto-reply, treat them
          as consent, count messages as sales, or publish feedback without
          explicit permission. Email delivery state “uncertain” requires
          checking Sent before any manual retry.
        </p>
      </div>
      {!rows.length && <p>No website submissions yet.</p>}
      {rows.map((row) => (
        <article key={row.id} className="form-card space-y-4">
          <div className="flex flex-wrap justify-between gap-4">
            <h2 className="text-xl font-bold">
              {row.kind === 'review' ? 'Feedback' : 'Contact'} · {row.topic}
            </h2>
            <p className="text-sm">
              Email: {row.notification_state} · Review: {row.moderation_status}
            </p>
          </div>
          <p className="break-all font-mono text-xs">
            {row.id} · {row.created_at} UTC
          </p>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-bold">Name / company (private)</dt>
              <dd>
                {row.contact_name} · {row.company || '—'}
              </dd>
            </div>
            <div>
              <dt className="font-bold">Entered email (unverified)</dt>
              <dd className="break-all">{row.contact_email}</dd>
            </div>
            <div>
              <dt className="font-bold">Public store / product</dt>
              <dd className="break-all">
                {row.store_url || '—'} · {row.product_id || '—'}
              </dd>
            </div>
            {row.kind === 'review' && (
              <div>
                <dt className="font-bold">Requested display / rating</dt>
                <dd>
                  {row.display_name || '—'} · {row.rating}/5 · public
                  permission: {row.publish_consent ? 'yes' : 'NO'}
                </dd>
              </div>
            )}
          </dl>
          <p className="whitespace-pre-wrap rounded-xl bg-[#f0f1e8] p-5 leading-7">
            {row.message}
          </p>
          {row.kind === 'review' && (
            <form
              action={`/api/website-reviews/${row.id}`}
              method="post"
              className="space-y-4"
            >
              {canPublishReview(row) && (
                <label className="flex items-start gap-3 text-sm leading-6">
                  <input
                    type="checkbox"
                    name="checked"
                    className="mt-1 size-4 shrink-0"
                  />
                  <span>
                    I checked this is a genuine experience, permission is still
                    valid, public text contains no private data, and this
                    follows the same standards for positive and negative
                    feedback. Publication does NOT claim verified purchase.
                  </span>
                </label>
              )}
              <div className="flex gap-3">
                {canPublishReview(row) && (
                  <button
                    name="status"
                    value="published"
                    className="button-primary"
                  >
                    Publish after review
                  </button>
                )}
                <button
                  name="status"
                  value="hidden"
                  className="button-secondary"
                >
                  Keep private / unpublish
                </button>
              </div>
            </form>
          )}
        </article>
      ))}
    </main>
  );
}
