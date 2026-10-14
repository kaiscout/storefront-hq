import { ArrowRight, Check, ClipboardCheck, RotateCcw } from 'lucide-react';
import Link from 'next/link';

import type {
  TriagePlan,
  TriageReach,
  TriageSymptom,
  TriageTiming,
} from '@/lib/triage';
import { triageSymptoms } from '@/lib/triage';

const reachOptions: { id: TriageReach; label: string }[] = [
  { id: 'everyone', label: 'More than one device' },
  { id: 'mobile', label: 'Mobile only' },
  { id: 'desktop', label: 'Desktop only' },
  { id: 'unknown', label: 'Not tested yet' },
];

const timingOptions: { id: TriageTiming; label: string }[] = [
  { id: 'now', label: 'It is happening now' },
  { id: 'recent', label: 'It started after a recent change' },
  { id: 'ongoing', label: 'It has been an ongoing problem' },
];

function Choice({
  name,
  value,
  label,
  checked,
}: {
  name: string;
  value: string;
  label: string;
  checked: boolean;
}) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 border-[#10261f]/15 bg-white/60 px-4 py-3 text-left text-sm font-bold leading-5 transition hover:border-[#10261f]/45 has-[:checked]:border-[#10261f] has-[:checked]:bg-[#10261f] has-[:checked]:text-white">
      <input
        className="peer sr-only"
        type="radio"
        name={name}
        value={value}
        defaultChecked={checked}
        required
      />
      <span className="grid size-6 shrink-0 place-items-center rounded-full border border-[#10261f]/25 peer-checked:border-[#a8d66d] peer-checked:bg-[#a8d66d] peer-checked:text-[#10261f]">
        <Check className="hidden size-3.5 stroke-[3] peer-checked:block" />
      </span>
      {label}
    </label>
  );
}

export function TriageTool({
  checkoutReady,
  plan,
  selected,
}: {
  checkoutReady: Record<string, boolean>;
  plan: TriagePlan | null;
  selected: {
    symptom: TriageSymptom | null;
    reach: TriageReach | null;
    timing: TriageTiming | null;
  };
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr]">
      <form
        action="/triage"
        method="get"
        className="rounded-[2rem] border-2 border-[#10261f] bg-white/55 p-5 shadow-[9px_9px_0_rgba(16,38,31,.12)] sm:p-8"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-[.17em] text-[#477a5b]">
              Three short questions
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
              Describe what you can observe
            </h2>
          </div>
          {selected.symptom || selected.reach || selected.timing ? (
            <Link
              href="/triage"
              className="inline-flex shrink-0 items-center gap-2 text-xs font-black underline decoration-[#ff6b35] decoration-2 underline-offset-4"
            >
              <RotateCcw className="size-3.5" /> Reset
            </Link>
          ) : null}
        </div>

        <fieldset className="mt-7">
          <legend className="text-sm font-black">1. What is the main problem?</legend>
          <div className="mt-3 grid gap-2.5">
            {triageSymptoms.map((option) => (
              <Choice
                key={option.id}
                name="symptom"
                value={option.id}
                label={option.label}
                checked={selected.symptom === option.id}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-7">
          <legend className="text-sm font-black">2. Who can reproduce it?</legend>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {reachOptions.map((option) => (
              <Choice
                key={option.id}
                name="reach"
                value={option.id}
                label={option.label}
                checked={selected.reach === option.id}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-7">
          <legend className="text-sm font-black">3. When did it begin?</legend>
          <div className="mt-3 grid gap-2.5">
            {timingOptions.map((option) => (
              <Choice
                key={option.id}
                name="timing"
                value={option.id}
                label={option.label}
                checked={selected.timing === option.id}
              />
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#ff6b35] px-6 text-sm font-black text-white shadow-[0_5px_0_#10261f] hover:bg-[#e95725]"
        >
          Show my triage plan <ArrowRight className="size-4" />
        </button>
      </form>

      <section
        aria-live="polite"
        className="rounded-[2rem] border-2 border-[#10261f] bg-[#10261f] p-6 text-[#f8f4e8] shadow-[11px_11px_0_#f2c14e] sm:p-9"
      >
        {plan ? (
          <>
            <p className="font-mono text-xs font-black uppercase tracking-[.17em] text-[#a8d66d]">
              Your public-store triage
            </p>
            <h2 className="mt-3 text-4xl font-black leading-[.98] tracking-[-0.045em]">
              {plan.title}
            </h2>
            <p className="mt-5 text-sm leading-6 text-[#c9d4c7]">
              {plan.summary}
            </p>

            <h3 className="mt-8 text-lg font-black">Do these checks first</h3>
            <ol className="mt-4 space-y-4">
              {plan.checks.map((check, index) => (
                <li key={check} className="flex gap-3 text-sm leading-6">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#a8d66d] font-mono text-xs font-black text-[#10261f]">
                    {index + 1}
                  </span>
                  {check}
                </li>
              ))}
            </ol>

            <div className="mt-7 rounded-2xl border border-white/15 bg-white/[.055] p-5">
              <h3 className="flex items-center gap-2 font-black text-[#f2c14e]">
                <ClipboardCheck className="size-5" /> Acceptance check
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#dce4da]">
                {plan.acceptance}
              </p>
            </div>

            <div className="mt-7">
              <h3 className="text-sm font-black">Capture before changing anything</h3>
              <ul className="mt-3 grid gap-2 text-sm text-[#c9d4c7] sm:grid-cols-2">
                {plan.evidence.map((item) => (
                  <li key={item} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-[#a8d66d]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={
                  checkoutReady[plan.productId]
                    ? `/buy/${plan.productId}`
                    : `/products/${plan.productId}`
                }
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#ff6b35] px-6 text-sm font-black text-white hover:bg-[#e95725]"
              >
                {checkoutReady[plan.productId]
                  ? 'Use the matched product'
                  : 'See the matched product'}{' '}
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href={`/start?product=${plan.productId}`}
                className="inline-flex h-12 items-center px-3 text-sm font-black underline decoration-[#a8d66d] decoration-2 underline-offset-4"
              >
                Check fit first
              </Link>
            </div>
          </>
        ) : (
          <div className="grid min-h-[31rem] place-items-center text-center">
            <div className="max-w-md">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#a8d66d] text-[#10261f]">
                <ClipboardCheck className="size-7" />
              </span>
              <p className="mt-6 font-mono text-xs font-black uppercase tracking-[.17em] text-[#a8d66d]">
                No email · no login · no crawl
              </p>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.045em]">
                Your first checks will appear here.
              </h2>
              <p className="mt-4 text-sm leading-6 text-[#c9d4c7]">
                Answer all three questions and submit. The tool does not save
                your answers or inspect your store.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
