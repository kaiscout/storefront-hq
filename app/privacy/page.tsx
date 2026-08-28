import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { publicConfig } from '@/lib/config';
import {
  UNQUALIFIED_RESEARCH_RETENTION_DAYS,
  UNSUCCESSFUL_LEAD_RETENTION_DAYS,
} from '@/lib/operations';

export const dynamic = 'force-dynamic';

export default function PrivacyPage() {
  const config = publicConfig();
  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground sm:px-8 sm:py-16">
      <article className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Home
        </Link>
        <p className="mt-10 font-mono text-xs uppercase tracking-[0.16em] text-[#477a5b]">
          Privacy notice · Last updated 28 August 2026
        </p>
        <h1 className="mt-4 text-5xl font-black tracking-[-0.05em]">
          Plain-English privacy notice
        </h1>
        {!config.launchReady ? (
          <div className="mt-6 rounded-xl border border-[#ff6b35]/40 bg-[#ff6b35]/10 p-4 text-sm">
            <strong>Launch gate:</strong> this service is not accepting data
            until the operator identity, private access, and required service
            integrations are configured.
          </div>
        ) : null}
        <div className="prose-qa mt-10 space-y-8 leading-7 text-muted-foreground">
          <section>
            <h2>Who controls the data</h2>
            <p>
              {config.operatorName ||
                '[OPERATOR NAME — REQUIRED BEFORE LAUNCH]'}{' '}
              is the controller. Privacy questions, objections and complaints
              can be sent to{' '}
              <a
                href={
                  config.contactEmail
                    ? `mailto:${config.contactEmail}`
                    : undefined
                }
              >
                {config.contactEmail ||
                  '[CONTACT EMAIL — REQUIRED BEFORE LAUNCH]'}
              </a>
              .
            </p>
          </section>
          <section>
            <h2>What is collected and why</h2>
            <p>
              For inbound requests: name, work email, company, public store URL
              and the request history are used to assess fit, answer the
              enquiry, schedule a call, take payment and deliver the service.
              The lawful bases are steps requested before a contract and
              performance of a contract.
            </p>
            <p>
              For public buyer-intent research: the system may store a public
              request URL, company name, store URL, role-address reply channel
              and a short excerpt. It does not harvest private contact details.
              The purpose is to respond to an explicit public request for
              relevant help; the basis is legitimate interests, balanced by
              source verification, channel rules, data minimisation and
              immediate objection handling.
            </p>
          </section>
          <section>
            <h2>Processors and sources</h2>
            <p>
              Public pages may be processed with Firecrawl. Email replies may be
              handled in a dedicated Google account. Calls may be booked through
              Cal.com. Payments may be processed by the checkout provider named
              on the payment page. Data comes from you, an explicit public buyer
              request, and those service events.
            </p>
          </section>
          <section>
            <h2>Retention</h2>
            <p>
              Unqualified research records are deleted within{' '}
              {UNQUALIFIED_RESEARCH_RETENTION_DAYS} days. Unsuccessful enquiries
              are deleted within {UNSUCCESSFUL_LEAD_RETENTION_DAYS} days.
              Contract, payment and delivery records are kept only as long as
              required for legal and accounting duties. A minimal suppression
              record may be kept to make sure an objection is honoured.
            </p>
          </section>
          <section>
            <h2>Your choices and rights</h2>
            <p>
              You can object to direct marketing at any time; the objection is
              effective immediately. You may also ask for access, correction,
              erasure, restriction or portability where applicable, and complain
              to the ICO. This site uses no advertising pixels or behavioural
              analytics.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
