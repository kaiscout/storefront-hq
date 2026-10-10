'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { websiteConfirmationSubject } from '@/lib/intake';
import { products, type ProductId } from '@/lib/products';

export function StartForm({
  enabled,
  contactEmail,
  initialProductId,
}: {
  enabled: boolean;
  contactEmail: string;
  initialProductId?: ProductId;
}) {
  const [state, setState] = useState<
    'idle' | 'submitting' | 'success' | 'error'
  >('idle');
  const [message, setMessage] = useState('');
  const [bookingUrl, setBookingUrl] = useState('');
  const [intakeId, setIntakeId] = useState('');

  async function submit(formData: FormData) {
    setState('submitting');
    setMessage('');
    const value = (key: string) => {
      const entry = formData.get(key);
      return typeof entry === 'string' ? entry : '';
    };
    const payload = {
      companyName: value('companyName'),
      contactName: value('contactName'),
      contactEmail: value('contactEmail'),
      storeUrl: value('storeUrl'),
      productId: value('productId'),
      problem: value('problem'),
      consent: formData.get('consent') === 'on',
      website: value('website'),
    };
    const response = await fetch('/api/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as {
      error?: string;
      id?: string;
      bookingUrl?: string | null;
    };
    if (!response.ok) {
      setState('error');
      setMessage(result.error ?? 'Something went wrong. Please try again.');
      return;
    }
    setIntakeId(result.id ?? '');
    setBookingUrl(result.bookingUrl ?? '');
    setState('success');
  }

  if (state === 'success') {
    return (
      <div className="rounded-2xl border border-[#a8d66d]/50 bg-[#e9f4dc] p-6 text-[#10261f]">
        <CheckCircle2 className="size-9" />
        <h2 className="mt-4 text-2xl font-black tracking-tight">
          Request received.
        </h2>
        <p className="mt-2 leading-7">
          We’ll review the problem and point you to the narrowest useful option.
          No backend invitation is needed.
        </p>
        <p className="mt-3 text-sm leading-6">
          To prevent someone entering another person’s address, this form never
          triggers an automatic email. For the fastest response,{' '}
          <a
            className="font-bold underline underline-offset-4"
            href={`mailto:${contactEmail}?subject=${encodeURIComponent(websiteConfirmationSubject(intakeId))}&body=${encodeURIComponent('I submitted a Storefront HQ product enquiry through storefronthq.co.uk. Please confirm the next step for my request.')}`}
          >
            confirm from your work email
          </a>{' '}
          or book the fit call below.
        </p>
        {bookingUrl ? (
          <a
            className="mt-5 inline-flex items-center gap-2 font-bold underline underline-offset-4"
            href={bookingUrl}
          >
            Choose a short fit call <ArrowRight className="size-4" />
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <form action={submit} className="space-y-5" aria-describedby="form-status">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="companyName">Company / store name</Label>
          <Input
            id="companyName"
            name="companyName"
            required
            maxLength={120}
            disabled={!enabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactName">Your name</Label>
          <Input
            id="contactName"
            name="contactName"
            autoComplete="name"
            required
            maxLength={120}
            disabled={!enabled}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="productId">Product you are considering</Label>
        <select
          id="productId"
          name="productId"
          defaultValue={initialProductId ?? ''}
          required
          disabled={!enabled}
          className="h-11 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="" disabled>
            Choose one
          </option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} — £{product.priceGbp}
              {product.billing === 'monthly' ? '/month' : ''}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="storeUrl">Live Shopify store URL</Label>
        <Input
          id="storeUrl"
          name="storeUrl"
          type="url"
          inputMode="url"
          placeholder="https://your-store.com"
          required
          disabled={!enabled}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="problem">What is the main problem or deadline?</Label>
        <textarea
          id="problem"
          name="problem"
          required
          minLength={10}
          maxLength={1200}
          disabled={!enabled}
          placeholder="What is happening, where does it happen, and when do you need to act?"
          className="min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contactEmail">Work email</Label>
        <Input
          id="contactEmail"
          name="contactEmail"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          disabled={!enabled}
        />
      </div>
      <div className="absolute left-[-9999px]" aria-hidden="true">
        <Label htmlFor="website">Leave this blank</Label>
        <Input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="flex items-start gap-3 rounded-xl border border-foreground/15 bg-white/40 p-4">
        <Checkbox id="consent" name="consent" required disabled={!enabled} />
        <Label htmlFor="consent" className="text-sm font-normal leading-6">
          You may use these details to assess this request and reply about the
          selected product. I have read the{' '}
          <Link
            href="/privacy"
            className="font-semibold underline underline-offset-2"
          >
            privacy notice
          </Link>
          .
        </Label>
      </div>
      <Button
        type="submit"
        size="lg"
        disabled={!enabled || state === 'submitting'}
        className="h-12 w-full rounded-full bg-[#ff6b35] text-base font-bold text-white hover:bg-[#e95725]"
      >
        {state === 'submitting' ? (
          <>
            <Loader2 className="animate-spin" /> Sending request
          </>
        ) : (
          <>
            Send product enquiry <ArrowRight />
          </>
        )}
      </Button>
      <output
        id="form-status"
        className="block min-h-6 text-sm text-destructive"
      >
        {state === 'error'
          ? message
          : !enabled
            ? 'Intake is not active yet. The operator must complete the verified launch setup first.'
            : ''}
      </output>
    </form>
  );
}
