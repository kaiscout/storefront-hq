import Link from 'next/link';
import { MessageSquareText, ShieldCheck, Star } from 'lucide-react';
import { SiteFooter, SiteHeader } from '@/components/site-shell';
import { WebsiteForm } from '@/components/website-form';
import { publicConfig } from '@/lib/config';
import { listPublicReviews } from '@/lib/website-database';
import { pageMetadata } from '@/lib/metadata';
import { getProduct } from '@/lib/products';

export const dynamic = 'force-dynamic';
export const metadata = pageMetadata(
  'Customer reviews & feedback',
  'Read genuine published feedback or share your own Storefront HQ experience. Every submission is moderated and public display is optional.',
  '/reviews',
);

export default async function ReviewsPage() {
  const reviews = await listPublicReviews();
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="page-intro">
        <div className="site-container">
          <p className="eyebrow">Real experiences. Useful feedback.</p>
          <h1 className="page-title">
            Your feedback
            <br />
            <span className="text-[#477a5b]">helps shape what’s next.</span>
          </h1>
          <p className="page-description">
            Used a Storefront HQ product or tried free triage? Tell us what
            helped and what didn’t. We welcome honest feedback—not just the
            glowing kind.
          </p>
          <a href="#leave-feedback" className="button-primary mt-7">
            Share your experience
          </a>
        </div>
      </section>
      <section className="site-container py-14 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Customer voices</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight">
              Published feedback
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Moderated before publication · no invented testimonials
          </p>
        </div>
        {reviews.length ? (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {reviews.map((review) => (
              <article key={review.id} className="form-card">
                <p
                  className="flex gap-1 text-[#855500]"
                  aria-label={`${review.rating} out of 5 stars`}
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className="size-4"
                      fill={star <= review.rating ? 'currentColor' : 'none'}
                    />
                  ))}
                </p>
                <blockquote className="mt-5 whitespace-pre-wrap text-base leading-8">
                  {review.message}
                </blockquote>
                <p className="mt-6 font-bold">{review.display_name}</p>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                  {review.topic === 'free-triage'
                    ? 'Free triage experience'
                    : getProduct(review.product_id || '')?.name ||
                      'Product experience'}{' '}
                  ·{' '}
                  {new Date(
                    review.created_at.replace(' ', 'T') + 'Z',
                  ).toLocaleDateString('en-GB', {
                    month: 'long',
                    year: 'numeric',
                    timeZone: 'UTC',
                  })}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-8 grid gap-8 rounded-3xl border border-dashed border-[#10261f]/25 bg-white/55 p-8 sm:p-10 md:grid-cols-[auto_1fr] md:items-center">
            <span className="grid size-16 place-items-center rounded-2xl bg-[#e8eddf]">
              <MessageSquareText className="size-7 text-[#477a5b]" />
            </span>
            <div>
              <h3 className="text-xl font-bold">
                No customer reviews published yet.
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                We’re building this page with genuine experiences. There is no
                star average, customer count or testimonial to claim before the
                evidence exists.
              </p>
              <Link
                href="/products/store-emergency-check#worked-example"
                className="mt-4 inline-block text-sm font-semibold underline underline-offset-4"
              >
                See how the work is presented in our controlled demonstration
              </Link>
              <p className="mt-2 text-xs text-muted-foreground">
                Our own test fixture—not a client result or customer review.
              </p>
            </div>
          </div>
        )}
      </section>
      <section
        id="leave-feedback"
        className="scroll-mt-28 border-t border-[#10261f]/10 bg-[#f0f1e8]"
      >
        <div className="site-container grid items-start gap-10 py-16 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
          <aside>
            <p className="eyebrow">Help us improve</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight">
              Honest is more helpful than perfect.
            </h2>
            <p className="mt-5 leading-7 text-muted-foreground">
              Describe your own experience. Your contact details remain private,
              and you choose whether we may show your rating and feedback
              publicly.
            </p>
            <div className="mt-8 rounded-2xl border border-[#10261f]/12 bg-white/60 p-6">
              <ShieldCheck className="size-6 text-[#477a5b]" />
              <h3 className="mt-4 font-bold">How reviews work</h3>
              <ul className="mt-4 list-disc space-y-3 pl-4 text-sm leading-7 text-muted-foreground">
                <li>
                  Every submission is checked for authenticity, personal data,
                  spam and relevance before display.
                </li>
                <li>
                  Positive and critical reviews follow the same standards. We
                  don’t remove feedback simply because it is negative.
                </li>
                <li>
                  Publication permission is optional and can be withdrawn by
                  email.
                </li>
                <li>
                  We don’t label a review “verified purchase” just because
                  someone fills in this form.
                </li>
              </ul>
            </div>
            <p className="mt-6 text-sm leading-7 text-muted-foreground">
              Need a response about an order or a problem? Use{' '}
              <Link
                href="/contact"
                className="font-semibold underline underline-offset-4"
              >
                Contact
              </Link>{' '}
              so we can handle it privately.
            </p>
          </aside>
          <WebsiteForm kind="review" enabled={publicConfig().intakeReady} />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
