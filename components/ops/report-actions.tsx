'use client';

import { useState } from 'react';
import { Check, Download, Loader2, Printer } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ReportActions({
  leadId,
  status,
  ready,
}: {
  leadId: string;
  status: string;
  ready: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function markDelivered() {
    setBusy(true);
    setError('');
    const response = await fetch(`/api/leads/${leadId}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'delivered',
        nextAction: 'Begin the 30-day regression watch',
      }),
    });
    const result = (await response.json()) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setError(result.error ?? 'Delivery approval failed');
      return;
    }
    router.refresh();
  }

  return (
    <div className="report-actions flex flex-wrap items-center gap-2">
      <a
        href={`/api/leads/${leadId}/report?format=csv`}
        className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}
      >
        <Download /> Download evidence CSV
      </a>
      <Button
        type="button"
        size="lg"
        variant="outline"
        onClick={() => window.print()}
      >
        <Printer /> Print / save PDF
      </Button>
      {status === 'fulfilling' ? (
        <Button
          type="button"
          size="lg"
          disabled={busy || !ready}
          onClick={markDelivered}
        >
          {busy ? <Loader2 className="animate-spin" /> : <Check />}
          Approve pack as delivered
        </Button>
      ) : null}
      {error ? (
        <p className="w-full text-sm font-semibold text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
