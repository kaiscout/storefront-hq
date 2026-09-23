'use client';

import { useState, type SyntheticEvent } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function FindingEditor({
  leadId,
  storeUrl,
}: {
  leadId: string;
  storeUrl: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const value = (name: string) => {
      const field = data.get(name);
      return typeof field === 'string' ? field.trim() : '';
    };
    const statusCode = value('statusCode');
    setBusy(true);
    setError('');
    const response = await fetch(`/api/leads/${leadId}/findings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: value('url'),
        title: value('title'),
        severity: value('severity'),
        category: value('category'),
        evidence: `${value('evidence')}\nEnvironment: ${value('environment')}\nReproduction: ${value('reproduction')}`,
        recommendation: `Fix: ${value('recommendation')}\nWhy it matters: ${value('impact')}\nSuggested owner: ${value('owner')}\nEffort: ${value('effort')}\nRetest: ${value('retest')}`,
        screenshotUrl: value('screenshotUrl'),
        ...(statusCode ? { statusCode: Number(statusCode) } : {}),
      }),
    });
    const result = (await response.json()) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setError(result.error ?? 'Finding could not be saved');
      return;
    }
    form.reset();
    router.refresh();
  }

  return (
    <details className="report-actions rounded-2xl border bg-white/70 p-5">
      <summary className="cursor-pointer list-none font-black text-[#477a5b]">
        <span className="inline-flex items-center gap-2">
          <Plus className="size-4" /> Add a human-verified finding
        </span>
      </summary>
      <form onSubmit={submit} className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label htmlFor="finding-url">Affected storefront URL</Label>
          <Input
            id="finding-url"
            name="url"
            type="url"
            defaultValue={storeUrl}
            required
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="finding-title">Finding</Label>
          <Input id="finding-title" name="title" minLength={5} required />
        </div>
        <div>
          <Label htmlFor="finding-severity">Severity</Label>
          <select
            id="finding-severity"
            name="severity"
            defaultValue="medium"
            className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm"
          >
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div>
          <Label htmlFor="finding-category">Category</Label>
          <Input
            id="finding-category"
            name="category"
            defaultValue="manual-qa"
            required
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="finding-evidence">Reproduction evidence</Label>
          <Textarea
            id="finding-evidence"
            name="evidence"
            rows={4}
            minLength={20}
            maxLength={2500}
            required
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="finding-recommendation">
            Fix-ready recommendation
          </Label>
          <Textarea
            id="finding-recommendation"
            name="recommendation"
            rows={4}
            minLength={10}
            maxLength={1200}
            required
          />
        </div>
        <div>
          <Label htmlFor="finding-environment">Observed environment / viewport</Label>
          <Input id="finding-environment" name="environment" maxLength={250} placeholder="Browser, device, market, timestamp" required />
        </div>
        <div>
          <Label htmlFor="finding-owner">Suggested owner</Label>
          <Input id="finding-owner" name="owner" maxLength={150} placeholder="e.g. Theme developer — merchant to confirm" required />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="finding-reproduction">Exact reproduction steps</Label>
          <Textarea id="finding-reproduction" name="reproduction" maxLength={800} placeholder="Starting URL → action → observed result" minLength={10} required />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="finding-impact">Why it matters — assessment, not proven lost revenue</Label>
          <Textarea id="finding-impact" name="impact" maxLength={700} placeholder="Describe the possible customer friction and what remains unknown." minLength={10} required />
        </div>
        <div>
          <Label htmlFor="finding-effort">Effort / implementation uncertainty</Label>
          <Input id="finding-effort" name="effort" maxLength={250} defaultValue="Not estimated — confirm with the implementer." required />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="finding-retest">Acceptance check — what must pass after repair?</Label>
          <Textarea id="finding-retest" name="retest" maxLength={1100} placeholder="Repeat these steps; specify the expected visible result." minLength={10} required />
        </div>
        <div>
          <Label htmlFor="finding-screenshot">
            Screenshot URL, if available
          </Label>
          <Input id="finding-screenshot" name="screenshotUrl" type="url" />
        </div>
        <div>
          <Label htmlFor="finding-status">
            Observed HTTP status, if relevant
          </Label>
          <Input
            id="finding-status"
            name="statusCode"
            type="number"
            min={100}
            max={599}
          />
        </div>
        <div className="md:col-span-2">
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Plus />}
            Add verified finding
          </Button>
          {error ? (
            <p className="mt-3 text-sm font-semibold text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      </form>
    </details>
  );
}

export function RemoveFindingButton({
  leadId,
  findingId,
}: {
  leadId: string;
  findingId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    const response = await fetch(`/api/leads/${leadId}/findings/${findingId}`, {
      method: 'DELETE',
    });
    setBusy(false);
    if (response.ok) router.refresh();
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="destructive"
      disabled={busy}
      onClick={remove}
    >
      {busy ? <Loader2 className="animate-spin" /> : <Trash2 />}
      Remove false positive
    </Button>
  );
}
