import { topThreeFixes, type EvidenceFinding } from '@/lib/report';

export function TopFixes({ findings }: { findings: EvidenceFinding[] }) {
  const fixes = topThreeFixes(findings);
  return (
    <section aria-labelledby="top-fixes-heading" className="rounded-2xl border-2 border-[#10261f] bg-white/75 p-5 sm:p-8">
      <p className="text-sm font-bold uppercase tracking-wider text-[#477a5b]">Decision brief</p>
      <h2 id="top-fixes-heading" className="mt-2 text-3xl font-black tracking-tight">Fix these three first.</h2>
      <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">Start with the highest recorded severity. Each action links the observation to a repair and a retest. This is a priority order, not a revenue forecast; implementation remains with your team.</p>
      {!fixes.length && <p className="mt-5 rounded-xl bg-[#f2c14e]/20 p-4">No complete findings yet. We do not fill this brief with invented issues.</p>}
      <div className="mt-6 space-y-5">
        {fixes.map((item) => (
          <article key={item.finding.id} className="report-finding break-inside-avoid border-t border-[#10261f]/20 pt-5">
            <div className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#10261f] text-lg font-black text-white">{item.rank}</span>
              <div className="min-w-0">
                <p className="text-sm font-bold capitalize text-[#477a5b]">{item.finding.severity} · {item.finding.category.replaceAll('-', ' ')}</p>
                <h3 className="mt-1 text-xl font-black">{item.finding.title}</h3>
                <p className="mt-2 break-all text-sm text-muted-foreground">{item.finding.url}</p>
              </div>
            </div>
            <dl className="mt-5 grid gap-4 md:grid-cols-2">
              {[
                ['Observed evidence', item.finding.evidence],
                ['Why it matters · assessment', item.impact],
                ['Next repair action', item.fix],
                ['Pass / fail retest', item.retest],
                ['Suggested owner', item.owner],
                ['Effort · not a quote', item.effort],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-[#10261f]/[0.04] p-4">
                  <dt className="text-sm font-bold">{label}</dt>
                  <dd className="mt-2 whitespace-pre-line text-base leading-7 text-muted-foreground">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-sm text-muted-foreground">Observed: {item.finding.found_at || 'Not recorded'}{item.finding.screenshot_url ? <> · <a className="underline" href={item.finding.screenshot_url} target="_blank" rel="noreferrer">Open evidence image</a></> : ' · No screenshot supplied'}</p>
          </article>
        ))}
      </div>
      {fixes.length > 0 && fixes.length < 3 && <p className="mt-5 text-sm">Only {fixes.length} complete finding(s) available. No padding added.</p>}
    </section>
  );
}
