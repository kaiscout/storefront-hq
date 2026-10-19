'use client';

import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { products } from '@/lib/products';

export function WebsiteForm({
  kind,
  enabled,
}: {
  kind: 'contact' | 'review';
  enabled: boolean;
}) {
  const [state, setState] = useState<
    'idle' | 'submitting' | 'success' | 'error'
  >('idle');
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');
  const [rating, setRating] = useState(0);
  const [publish, setPublish] = useState(false);
  const [experience, setExperience] = useState('customer');
  const submissionKey = useRef('');
  const sending = useRef(false);
  const isReview = kind === 'review';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) || '');
    if (isReview && !rating) {
      setError('Please choose a rating from 1 to 5.');
      setState('error');
      return;
    }
    if (!submissionKey.current) submissionKey.current = crypto.randomUUID();
    sending.current = true;
    setState('submitting');
    setError('');
    const payload = {
      kind,
      submissionKey: submissionKey.current,
      contactName: value('contactName'),
      contactEmail: value('contactEmail'),
      company: value('company'),
      storeUrl: value('storeUrl'),
      topic: value('topic'),
      productId: value('productId'),
      message: value('message'),
      consent: data.get('consent') === 'on',
      website: value('website'),
      ...(isReview
        ? {
            rating,
            displayName: value('displayName'),
            publishConsent: publish,
            genuineExperience: data.get('genuineExperience') === 'on',
          }
        : {}),
    };
    try {
      const response = await fetch('/api/website-forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
        id?: string;
      };
      if (!response.ok || !result.ok)
        throw new Error(
          result.error || 'We could not confirm receipt. Please try again.',
        );
      setReference(result.id || submissionKey.current);
      setState('success');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'We could not confirm receipt. Your message is still here; retry or email us directly.',
      );
      setState('error');
    } finally {
      sending.current = false;
    }
  }

  if (state === 'success')
    return (
      <div
        className="form-card border-[#477a5b]/30 bg-[#edf3e6]"
        role="status"
        aria-live="polite"
      >
        <CheckCircle2 className="size-10 text-[#477a5b]" />
        <h2 className="mt-5 text-3xl font-extrabold tracking-tight">
          {isReview
            ? 'Thank you for the honest feedback.'
            : 'Your message is safely received.'}
        </h2>
        <p className="mt-4 leading-7 text-[#53655c]">
          {isReview
            ? 'Your feedback is saved privately and queued for our inbox. Nothing is published automatically. If you gave permission, we’ll check it before any public display.'
            : 'Your details are saved privately and queued for the Storefront HQ inbox. Email delivery runs automatically; you do not need to open an email app to submit this form.'}
        </p>
        <p className="mt-4 text-sm leading-6 text-[#53655c]">
          We do not send an automatic email to the address entered here because
          the form cannot verify who owns it. You can email{' '}
          <a
            href="mailto:front.storecheckqa@gmail.com"
            className="font-semibold underline underline-offset-4"
          >
            front.storecheckqa@gmail.com
          </a>{' '}
          from your own address if you want to confirm a reply channel.
        </p>
        <p className="mt-5 break-all rounded-xl bg-white/70 p-3 font-mono text-xs">
          Reference: {reference}
        </p>
        <Link
          href={isReview ? '/products' : '/triage'}
          className="button-primary mt-6"
        >
          {isReview ? 'Explore the products' : 'Try free triage while you wait'}{' '}
          <ArrowRight className="size-4" />
        </Link>
      </div>
    );

  return (
    <form
      action="/api/website-forms"
      method="post"
      onSubmit={submit}
      className="form-card space-y-6"
      aria-describedby={`${kind}-form-note ${kind}-form-status`}
    >
      <div>
        <p className="eyebrow">
          {isReview ? 'Your experience matters' : 'Let’s get the right context'}
        </p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-tight">
          {isReview ? 'Leave your feedback' : 'Send us a message'}
        </h2>
        <p id={`${kind}-form-note`} className="form-hint">
          {isReview
            ? 'Positive, mixed or critical: tell us what actually happened. Fields marked * are required.'
            : 'A little detail helps us give a useful answer. Fields marked * are required.'}
        </p>
      </div>
      <fieldset
        disabled={!enabled || state === 'submitting'}
        className="min-w-0 space-y-6 disabled:opacity-70"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="form-label" htmlFor={`${kind}-name`}>
              Your name *
            </label>
            <input
              className="form-control"
              id={`${kind}-name`}
              name="contactName"
              autoComplete="name"
              required
              minLength={2}
              maxLength={100}
            />
          </div>
          <div>
            <label className="form-label" htmlFor={`${kind}-email`}>
              Email address *{' '}
              <span className="font-normal text-muted-foreground">
                (private)
              </span>
            </label>
            <input
              className="form-control"
              id={`${kind}-email`}
              name="contactEmail"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </div>
        </div>
        {isReview ? (
          <>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="form-label" htmlFor="review-topic">
                  Your experience *
                </label>
                <select
                  className="form-control"
                  id="review-topic"
                  name="topic"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                >
                  <option value="customer">
                    I used a paid product / service
                  </option>
                  <option value="free-triage">
                    I used the free triage tool
                  </option>
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="review-product">
                  Product {experience === 'customer' ? '*' : '(optional)'}
                </label>
                <select
                  className="form-control"
                  id="review-product"
                  name="productId"
                  required={experience === 'customer'}
                  defaultValue=""
                >
                  <option value="">Choose a product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <fieldset className="min-w-0">
              <legend className="form-label">Your overall rating *</legend>
              <div
                className="flex flex-wrap gap-1 sm:gap-2"
                role="radiogroup"
                aria-label="Overall rating"
              >
                {[1, 2, 3, 4, 5].map((stars) => (
                  <label key={stars} className="relative cursor-pointer">
                    <input
                      className="peer sr-only"
                      type="radio"
                      name="rating"
                      value={stars}
                      checked={rating === stars}
                      onChange={() => setRating(stars)}
                      required
                    />
                    <span
                      className={`flex size-9 items-center justify-center rounded-xl border peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#b94b23] sm:size-12 ${rating >= stars ? 'border-[#9a6710] bg-[#f8e7b7] text-[#855500]' : 'border-[#b5bdb1] bg-white text-[#53655c]'}`}
                    >
                      <Star
                        className="size-5"
                        fill={rating >= stars ? 'currentColor' : 'none'}
                      />
                      <span className="sr-only">
                        {stars} {stars === 1 ? 'star' : 'stars'}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <p className="form-hint">
                {rating
                  ? `${rating} out of 5 selected`
                  : '1 = poor · 5 = excellent'}
              </p>
            </fieldset>
          </>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="form-label" htmlFor="contact-topic">
                What can we help with? *
              </label>
              <select
                className="form-control"
                id="contact-topic"
                name="topic"
                required
                defaultValue=""
              >
                <option value="" disabled>
                  Choose a topic
                </option>
                <option value="store-issue">A public storefront problem</option>
                <option value="product-question">
                  Choosing a product / checking fit
                </option>
                <option value="existing-order">
                  An existing order or subscription
                </option>
                <option value="agency">An agency / partnership enquiry</option>
                <option value="privacy">Privacy or data request</option>
                <option value="other">Something else</option>
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="contact-product">
                Product <span className="font-normal">(optional)</span>
              </label>
              <select
                className="form-control"
                id="contact-product"
                name="productId"
                defaultValue=""
              >
                <option value="">Not sure yet / general enquiry</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="form-label" htmlFor={`${kind}-company`}>
              Company / store <span className="font-normal">(optional)</span>
            </label>
            <input
              className="form-control"
              id={`${kind}-company`}
              name="company"
              autoComplete="organization"
              maxLength={120}
            />
          </div>
          <div>
            <label className="form-label" htmlFor={`${kind}-url`}>
              Public store URL <span className="font-normal">(optional)</span>
            </label>
            <input
              className="form-control"
              id={`${kind}-url`}
              name="storeUrl"
              type="url"
              inputMode="url"
              placeholder="https://your-store.com"
              maxLength={500}
            />
            <p className="form-hint">
              Public HTTPS links only. No private links or access tokens.
            </p>
          </div>
        </div>
        <div>
          <label className="form-label" htmlFor={`${kind}-message`}>
            {isReview
              ? 'What worked, and what could be better?'
              : 'Tell us what you need'}{' '}
            *
          </label>
          <textarea
            className="form-control min-h-40 resize-y"
            id={`${kind}-message`}
            name="message"
            required
            minLength={20}
            maxLength={3000}
            placeholder={
              isReview
                ? 'Which product did you use? What was useful? What would you change?'
                : 'Describe the issue, exact public page, device/browser, what you expected, and any deadline. For an order question, include the order reference — never card details.'
            }
          />
          <p className="form-hint">
            20–3,000 characters. Do not include passwords, customer data,
            payment details or private screenshots.
          </p>
        </div>
        {isReview && (
          <>
            <label className="flex items-start gap-3 text-sm leading-6">
              <input
                type="checkbox"
                name="genuineExperience"
                required
                className="mt-1 size-4 shrink-0 accent-[#10261f]"
              />
              <span>
                I’m describing my own genuine experience, not submitting
                advertising or someone else’s review. *
              </span>
            </label>
            <div className="rounded-2xl border border-[#10261f]/12 bg-[#f4f5ee] p-5">
              <label className="flex items-start gap-3 text-sm leading-6">
                <input
                  type="checkbox"
                  checked={publish}
                  onChange={(e) => setPublish(e.target.checked)}
                  className="mt-1 size-4 shrink-0 accent-[#10261f]"
                />
                <span>
                  <strong>You may publish my rating and feedback</strong> with
                  the display name below. Optional; leave unchecked for private
                  feedback. My email, full contact name and store URL stay
                  private.
                </span>
              </label>
              <div className="mt-4">
                <label className="form-label" htmlFor="review-display">
                  Public display name {publish ? '*' : '(optional)'}
                </label>
                <input
                  className="form-control"
                  id="review-display"
                  name="displayName"
                  placeholder="e.g. Alex · independent seller"
                  required={publish}
                  minLength={publish ? 2 : undefined}
                  maxLength={80}
                />
                <p className="form-hint">
                  Choose only what you’re happy to show publicly. You can
                  withdraw publication permission by emailing us.
                </p>
              </div>
            </div>
          </>
        )}
        <div
          className="absolute -left-[10000px] h-px w-px overflow-hidden"
          aria-hidden="true"
        >
          <label htmlFor={`${kind}-website`}>Leave this blank</label>
          <input
            id={`${kind}-website`}
            name="website"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>
        <label className="flex items-start gap-3 text-sm leading-6">
          <input
            type="checkbox"
            name="consent"
            required
            className="mt-1 size-4 shrink-0 accent-[#10261f]"
          />
          <span>
            Storefront HQ may use these details to handle this{' '}
            {isReview ? 'feedback' : 'request'}. I have read the{' '}
            <Link
              className="font-semibold underline underline-offset-4"
              href="/privacy"
            >
              privacy notice
            </Link>
            . This is not a marketing subscription. *
          </span>
        </label>
        <button
          className="button-primary w-full"
          type="submit"
          disabled={!enabled || state === 'submitting'}
        >
          {state === 'submitting' ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Submitting…
            </>
          ) : (
            <>
              {isReview
                ? 'Submit feedback for review'
                : 'Send to Storefront HQ'}{' '}
              <ArrowRight className="size-4" />
            </>
          )}
        </button>
      </fieldset>
      <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" />
        {isReview
          ? 'No instant publication. No invented reviews or verified-purchase claims.'
          : 'Private submission. No automatic marketing. No merchant-admin access needed.'}
      </p>
      <p
        id={`${kind}-form-status`}
        role={state === 'error' ? 'alert' : 'status'}
        aria-live="polite"
        className="text-sm leading-6 text-[#a3321b]"
      >
        {!enabled
          ? 'This form is temporarily unavailable. Please email front.storecheckqa@gmail.com.'
          : error}
      </p>
      <noscript>
        <p className="text-sm">
          JavaScript is needed for this form. Please email{' '}
          <a href="mailto:front.storecheckqa@gmail.com">
            front.storecheckqa@gmail.com
          </a>{' '}
          instead.
        </p>
      </noscript>
    </form>
  );
}
