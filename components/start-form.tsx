'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function StartForm({ enabled }: { enabled: boolean }) {
  const [state, setState] = useState<
    'idle' | 'submitting' | 'success' | 'error'
  >('idle');
  const [message, setMessage] = useState('');
  const [bookingUrl, setBookingUrl] = useState('');

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
      bookingUrl?: string | null;
    };
    if (!response.ok) {
      setState('error');
      setMessage(result.error ?? 'Something went wrong. Please try again.');
      return;
    }
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
          We’ll first confirm that your store fits the fixed scope. No backend
          invitation is needed.
        </p>
        {bookingUrl ? (
          <a
            className="mt-5 inline-flex items-center gap-2 font-bold underline underline-offset-4"
            href={bookingUrl}
          >
            Choose a 20-minute fit call <ArrowRight className="size-4" />
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
          QA sprint. I have read the{' '}
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
            Request a fit check <ArrowRight />
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
