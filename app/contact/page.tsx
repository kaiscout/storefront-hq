import Link from 'next/link';
import {
  ArrowUpRight,
  Check,
  Clock3,
  LifeBuoy,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { SiteFooter, SiteHeader } from '@/components/site-shell';
import { WebsiteForm } from '@/components/website-form';
import { publicConfig } from '@/lib/config';
import { pageMetadata } from '@/lib/metadata';

export const dynamic = 'force-dynamic';
export const metadata = pageMetadata(
  'Contact',
  'Ask about a storefront issue, an order or product fit. Send a private message directly to the Storefront HQ inbox.',
  '/contact',
);
const faqs = [
  [
    'What should I include about a broken store?',
    'The exact public URL, device and browser, steps to reproduce, expected versus observed result, when it started, and who will implement a repair. Don’t send merchant-admin access or customer data.',
  ],
  [
    'Does sending this form start paid work?',
    'No. This is an enquiry, not an order. We confirm fit and scope before sharing a checkout link. A service starts only after safely matched payment and the required public details.',
  ],
  [
    'Do you fix the store code?',
    'Store Emergency Check provides diagnosis, repair direction and one public retest after repair. Your merchant, developer or agency owns implementation. It does not include backend access or implementation.',
  ],
  [
    'Can I get help with a subscription or an existing order?',
    'Yes. Select “An existing order or subscription” and include your reference. Seller Campaign Club can also be cancelled through Stripe with no minimum term. Never include payment-card details in a message.',
  ],
  [
    'Will my details appear on the website?',
    'Contact messages stay private. Review feedback is also private unless you separately allow publication and it passes moderation. The form does not add you to a marketing list.',
  ],
];

export default function ContactPage() {
  const config = publicConfig();
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="page-intro">
        <div className="site-container">
          <p className="eyebrow">A real question deserves a useful answer</p>
          <h1 className="page-title">
            Let’s find your
            <br />
            <span className="text-[#477a5b]">next clear step.</span>
          </h1>
          <p className="page-description">
            Tell us what’s happening, ask about a product or get help with an
            existing order. Your message goes privately to Storefront HQ—not
            into a public comment thread.
          </p>
        </div>
      </section>
      <section className="site-container grid items-start gap-10 py-14 sm:py-20 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
        <aside className="space-y-8">
          <div className="rounded-3xl bg-[#10261f] p-7 text-[#fbfaf5]">
            <Mail className="size-7 text-[#dbe8c7]" />
            <h2 className="mt-5 text-2xl font-bold tracking-tight">
              Straight to our inbox.
            </h2>
            <a
              href="mailto:front.storecheckqa@gmail.com"
              className="mt-3 inline-block break-all text-base font-semibold underline decoration-[#ff9b70] underline-offset-4"
            >
              front.storecheckqa@gmail.com
            </a>
            <p className="mt-4 text-sm leading-7 text-[#c4d0c4]">
              The form saves your message and automatically queues an email to
              this inbox. Prefer email? You can write directly from your own
              address.
            </p>
            <div className="mt-6 border-t border-white/15 pt-5">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Clock3 className="size-4" /> Enquiry first. No payment
                required.
              </p>
              <p className="mt-2 text-sm leading-6 text-[#c4d0c4]">
                Contact isn’t a 24/7 live-support line. The paid Emergency
                Check’s 24-hour initial diagnosis is a separate service
                commitment.
              </p>
            </div>
          </div>
          <div>
            <p className="eyebrow">Make the first message useful</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight">
              Give us the context, not the keys.
            </h2>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-muted-foreground">
              {[
                'Share one exact public page and the problem you see.',
                'Tell us your device, browser and any real deadline.',
                'For order support, include the order reference.',
                'Keep passwords, personal customer data and card details out.',
              ].map((text) => (
                <li key={text} className="flex gap-3">
                  <Check className="mt-1 size-4 shrink-0 text-[#477a5b]" />
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-[#10261f]/12 bg-white/50 p-6">
            <LifeBuoy className="size-5 text-[#477a5b]" />
            <h3 className="mt-3 font-bold">Need a first check right now?</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Free triage gives you a practical plan without an email, login or
              crawl. It’s guidance, not a live diagnosis.
            </p>
            <Link
              href="/triage"
              className="mt-4 inline-flex items-center gap-2 text-sm font-bold underline underline-offset-4"
            >
              Open free triage <ArrowUpRight className="size-4" />
            </Link>
          </div>
          {config.calUrl && (
            <Link
              href={config.calUrl}
              className="inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4"
            >
              Prefer to talk? Check fit-call availability{' '}
              <ArrowUpRight className="size-4" />
            </Link>
          )}
        </aside>
        <WebsiteForm kind="contact" enabled={config.intakeReady} />
      </section>
      <section className="border-t border-[#10261f]/10 bg-[#f0f1e8]">
        <div className="site-container grid gap-10 py-16 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="eyebrow">Before you send</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight">
              A few useful answers.
            </h2>
            <p className="mt-4 flex gap-2 text-sm leading-6 text-muted-foreground">
              <ShieldCheck className="mt-1 size-4 shrink-0" /> Clear scope.
              Private details. No pressure to buy.
            </p>
          </div>
          <div className="divide-y divide-[#10261f]/15">
            {faqs.map(([question, answer]) => (
              <details key={question} className="group py-5 first:pt-0">
                <summary className="cursor-pointer text-base font-bold leading-7">
                  {question}
                </summary>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
