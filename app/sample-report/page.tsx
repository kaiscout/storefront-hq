import Link from 'next/link';
import { TopFixes } from '@/components/top-fixes';
import { offer } from '@/lib/offer';
import { demoFindings } from '@/lib/demo-evidence';
import verification from '@/public/demo-evidence/verification.json';

export const metadata = { title: 'Real QA demonstration & top-three fixes | Storefront HQ' };

export default function SampleReportPage() {
  return (
    <main className="report-shell min-h-screen bg-[#ece8df] px-5 py-8 text-[#10261f] sm:px-8 sm:py-12">
      <article className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-[#10261f]/15 bg-[#f8f4e8]">
        <header className="bg-[#10261f] p-6 text-[#f8f4e8] sm:p-10">
          <Link href="/" className="text-sm font-bold text-[#cdeca5] underline">← Storefront HQ</Link>
          <p className="mt-8 text-sm font-bold uppercase tracking-wider text-[#cdeca5]">Controlled demonstration · real browser checks</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">See the problem.<br />Know the fix.<br />Verify it worked.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/75">We built a small test storefront with three intentional defects, reproduced them, then tested a corrected version. This is our own fixture—not a client case study, a Shopify installation or a claim of increased sales.</p>
          <div className="report-actions mt-7 flex flex-wrap gap-3">
            <Link href="/demo/before" className="rounded-full bg-[#f2c14e] px-5 py-3 font-bold text-[#10261f]">Try the broken journey</Link>
            <Link href="/demo/after" className="rounded-full border border-white/40 px-5 py-3 font-bold">Retest the corrected version</Link>
          </div>
        </header>
        <div className="space-y-10 p-6 sm:p-10">
          <section aria-labelledby="verification-title" className="rounded-2xl bg-[#d9e8c8]/60 p-5 sm:p-7">
            <h2 id="verification-title" className="text-2xl font-black">{verification.verified ? 'Reproduced before. Passed after.' : 'Verification in progress'}</h2>
            <p className="mt-3 text-base leading-7">The test selects Navy, adds the £69 bag, compares the cart colour and delivery charge, then follows the size-guide route. The corrected version must retain Navy, show £0 delivery and serve the guide successfully.</p>
            {verification.verified && <p className="mt-3 text-sm leading-6">Recorded {verification.checkedAt} · Chromium · 390 × 844 and 1440 × 1000 · local build of this fixture. Public retest links above let you check the published behavior. No production payment, merchant backend or Firecrawl request was used.</p>}
          </section>
          <TopFixes findings={demoFindings(verification.verified ? verification.checkedAt : '')} />
          {verification.verified && <section aria-labelledby="screenshots-title">
            <h2 id="screenshots-title" className="text-2xl font-black">Actual browser captures</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">Same selection and actions in each version. These are captured pages, not generated images.</p>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              {(['before', 'after'] as const).map((mode) => <figure key={mode} className="overflow-hidden rounded-2xl border bg-white">
                <figcaption className="p-4 text-lg font-black">{mode === 'before' ? 'Before · Navy selected, Natural in cart, £6 delivery' : 'After · Navy in cart, £0 delivery'}</figcaption>
                <a href={`/demo-evidence/${mode}-mobile.png`} target="_blank" rel="noreferrer"><img src={`/demo-evidence/${mode}-mobile.png`} alt={mode === 'before' ? 'Actual mobile test: Navy selected but Natural added, delivery £6 despite free delivery over £60.' : 'Actual mobile retest: Navy selected and added, delivery £0 on the £69 order.'} width={390} height={1390} className="h-auto w-full border-t" /></a>
              </figure>)}
            </div>
            <p className="mt-4 text-sm"><a className="font-bold underline" href="/demo-evidence/verification.json">Open recorded checks and timestamps (JSON)</a></p>
          </section>}
          <section className="rounded-2xl border bg-white/70 p-6">
            <h2 className="text-2xl font-black">Exact reproduction and acceptance checks</h2>
            <ol className="mt-5 list-decimal space-y-4 pl-6 text-base leading-7">
              <li>Open the before version in a fresh session. Select Navy, then “Add to demo cart.” The cart shows Natural. Repeat on the corrected version: the cart must show Navy. Also repeat with Natural.</li>
              <li>The banner offers free delivery over £60. Add the £69 test product. Before: £6 delivery and £75 total. After: £0 delivery and £69 total. No live checkout is involved.</li>
              <li>Follow “Read the size guide.” Before: the linked route returns HTTP 404. After: HTTP 200 and the bag dimensions are visible, with a working route back to the product.</li>
            </ol>
            <p className="mt-5 text-base leading-7 text-muted-foreground">Suggested repairs describe the principle. A merchant’s actual theme, apps, markets and shipping configuration must be checked before their team implements any change. This demo is not evidence that another store has these defects.</p>
          </section>
          <section className="grid gap-6 rounded-2xl bg-[#f2c14e] p-6 md:grid-cols-[1fr_auto] md:items-center sm:p-8">
            <div>
              <h2 className="text-3xl font-black tracking-tight">The same clarity. Your storefront’s evidence.</h2>
              <p className="mt-4 max-w-3xl text-base leading-7">£{offer.priceGbp} paid before work · {offer.deliveryHours}-hour turnaround · up to {offer.pageLimit} public pages · {offer.selectedFindings} fix-ready findings · {offer.handoffMinutes}-minute handoff · {offer.watchDays}-day regression watch for up to {offer.watchRouteLimit} approved public routes.</p>
              <p className="mt-3 text-sm leading-6">This demonstration contains three seeded issues, not a full 12-finding client pack. We provide diagnosis and repair guidance; implementation, merchant-admin access and revenue guarantees are excluded. <Link href="/terms" className="underline">Existing service terms apply.</Link></p>
            </div>
            <Link href="/start" className="report-actions rounded-full bg-[#10261f] px-6 py-4 text-center font-bold text-white">Request a fit check</Link>
          </section>
        </div>
      </article>
    </main>
  );
}
