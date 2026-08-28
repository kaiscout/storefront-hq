'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Loader2, Play } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { PipelineStatus } from '@/lib/pipeline';

export function LeadActions({
  lead,
  proposal,
  checkoutUrl,
  watchRoutes,
}: {
  lead: {
    id: string;
    status: PipelineStatus;
    companyName: string;
    storeUrl: string;
    contactEmail: string;
    contactChannel: string;
  };
  proposal: string;
  checkoutUrl: string;
  watchRoutes: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [routesText, setRoutesText] = useState(watchRoutes.join('\n'));

  async function call(path: string, body?: unknown) {
    setBusy(true);
    setError('');
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
    const result = (await response.json()) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setError(result.error ?? 'Action failed');
      return false;
    }
    router.refresh();
    return true;
  }

  async function qualify(formData: FormData) {
    const value = (key: string) => {
      const entry = formData.get(key);
      return typeof entry === 'string' ? entry : '';
    };
    await call(`/api/leads/${lead.id}/qualify`, {
      companyName: value('companyName'),
      storeUrl: value('storeUrl'),
      contactEmail: value('contactEmail'),
      contactChannel: value('contactChannel') || 'source-platform',
      explicitIntentConfirmed: formData.get('explicitIntentConfirmed') === 'on',
    });
  }

  async function copyProposal() {
    await navigator.clipboard.writeText(proposal);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  async function copyPaymentLink() {
    const separator = checkoutUrl.includes('?') ? '&' : '?';
    await navigator.clipboard.writeText(
      `${checkoutUrl}${separator}client_reference_id=${encodeURIComponent(lead.id)}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  async function saveWatchRoutes() {
    const routes = routesText
      .split(/[\r\n,]+/)
      .map((route) => route.trim())
      .filter(Boolean);
    await call(`/api/leads/${lead.id}/watch-routes`, { routes });
  }

  if (lead.status === 'discovered') {
    return (
      <details className="min-w-[240px] text-left">
        <summary className="cursor-pointer text-xs font-bold text-[#477a5b]">
          Verify intent + preview
        </summary>
        <form
          action={qualify}
          className="mt-3 space-y-3 rounded-xl border bg-background p-3 shadow-lg"
        >
          <div>
            <Label className="text-xs">Company</Label>
            <Input
              name="companyName"
              defaultValue={lead.companyName}
              required
            />
          </div>
          <div>
            <Label className="text-xs">Store URL</Label>
            <Input
              name="storeUrl"
              type="url"
              defaultValue={lead.storeUrl}
              required
              placeholder="https://…"
            />
          </div>
          <div>
            <Label className="text-xs">
              Reply email, if the request explicitly lists one
            </Label>
            <Input
              name="contactEmail"
              type="email"
              defaultValue={lead.contactEmail}
            />
          </div>
          <div>
            <Label className="text-xs" htmlFor={`channel-${lead.id}`}>
              Reply channel
            </Label>
            <select
              id={`channel-${lead.id}`}
              name="contactChannel"
              defaultValue={lead.contactChannel}
              className="mt-1 h-9 w-full rounded-lg border bg-background px-2 text-sm"
            >
              <option value="source-platform">Source platform</option>
              <option value="direct-email">Explicit reply email</option>
            </select>
          </div>
          <label className="flex items-start gap-2 text-xs leading-5">
            <input
              name="explicitIntentConfirmed"
              type="checkbox"
              required
              className="mt-1"
            />
            I opened the source and confirmed the buyer explicitly requested
            this help and the chosen reply channel is allowed.
          </label>
          <Button type="submit" size="sm" disabled={busy} className="w-full">
            {busy ? <Loader2 className="animate-spin" /> : <Check />} Qualify
          </Button>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </form>
      </details>
    );
  }

  if (lead.status === 'qualified') {
    return (
      <Button
        size="sm"
        disabled={busy}
        onClick={() =>
          call(`/api/leads/${lead.id}/transition`, {
            status: 'proposal_ready',
            nextAction: 'Create the reply draft in the approved channel',
          })
        }
      >
        {busy ? <Loader2 className="animate-spin" /> : <Check />} Approve
        proposal
      </Button>
    );
  }

  if (
    lead.status === 'proposal_ready' &&
    lead.contactChannel === 'source-platform'
  ) {
    return (
      <div className="flex flex-col items-end gap-2">
        <Button variant="outline" size="sm" onClick={copyProposal}>
          {copied ? <Check /> : <Copy />} {copied ? 'Copied' : 'Copy proposal'}
        </Button>
        <Button
          size="sm"
          disabled={busy}
          onClick={() =>
            call(`/api/leads/${lead.id}/transition`, {
              status: 'drafted',
              nextAction: 'Submit in the source platform after final review',
            })
          }
        >
          Mark drafted
        </Button>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    );
  }

  if (['paid', 'fulfilling', 'delivered'].includes(lead.status)) {
    return (
      <div className="flex min-w-[260px] flex-col items-end gap-2">
        {lead.status === 'paid' ? (
          <Button
            size="sm"
            disabled={busy}
            onClick={() => call(`/api/leads/${lead.id}/audit`)}
          >
            {busy ? <Loader2 className="animate-spin" /> : <Play />} Start audit
          </Button>
        ) : null}
        <details className="w-full text-left">
          <summary className="cursor-pointer text-right text-xs font-bold text-[#477a5b]">
            Watch routes · {watchRoutes.length}/10
          </summary>
          <div className="mt-2 space-y-2 rounded-xl border bg-background p-3 shadow-lg">
            <Label className="text-xs">
              Client-approved HTTPS routes, one per line
            </Label>
            <Textarea
              value={routesText}
              onChange={(event) => setRoutesText(event.target.value)}
              rows={6}
              placeholder={lead.storeUrl}
            />
            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={busy}
              onClick={saveWatchRoutes}
            >
              {busy ? <Loader2 className="animate-spin" /> : <Check />} Save
              watch routes
            </Button>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>
        </details>
      </div>
    );
  }

  if (
    lead.status === 'booked' &&
    checkoutUrl &&
    lead.contactChannel !== 'source-platform'
  ) {
    return (
      <Button variant="outline" size="sm" onClick={copyPaymentLink}>
        {copied ? <Check /> : <Copy />}{' '}
        {copied ? 'Copied' : 'Copy payment link'}
      </Button>
    );
  }

  if (lead.status === 'booked' && lead.contactChannel === 'source-platform') {
    return (
      <Button
        size="sm"
        disabled={busy}
        onClick={() =>
          call(`/api/leads/${lead.id}/transition`, {
            status: 'paid',
            nextAction:
              'Marketplace escrow confirmed; start the Firecrawl audit',
          })
        }
      >
        {busy ? <Loader2 className="animate-spin" /> : <Check />} Mark escrow
        funded
      </Button>
    );
  }

  return (
    <span className="text-xs text-muted-foreground">
      {lead.status.replaceAll('_', ' ')}
    </span>
  );
}
