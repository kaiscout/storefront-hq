import Link from 'next/link';

import { SiteFooter, SiteHeader } from '@/components/site-shell';
import { publicConfig } from '@/lib/config';
import { products, productPrice } from '@/lib/products';

export const dynamic = 'force-dynamic';

export default function TermsPage() {
  const config = publicConfig();
  const identityReady = Boolean(config.businessName && config.businessAddress);
  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <article className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-20">
        <p className="font-mono text-xs font-black uppercase tracking-[0.16em] text-[#477a5b]">
          Storefront HQ · Product terms · Last updated 10 October 2026
        </p>
        <h1 className="mt-4 text-5xl font-black tracking-[-0.05em]">
          Clear products, prices and responsibilities.
        </h1>
        {!identityReady ? (
          <div className="mt-7 rounded-2xl border border-[#ff6b35]/40 bg-[#ff6b35]/10 p-5 text-sm leading-6">
            <strong>Checkout gate:</strong> online checkout stays unavailable
            until the seller’s legal business name and trading address are
            published here.
          </div>
        ) : null}
        <div className="prose-qa mt-10 space-y-9 leading-7 text-muted-foreground">
          <section>
            <h2>Seller and contact</h2>
            <p>
              {identityReady ? (
                <>
                  {config.businessName}, trading as Storefront HQ, at{' '}
                  {config.businessAddress}.
                </>
              ) : (
                <>
                  The seller identity and trading address must be completed
                  before checkout is activated.
                </>
              )}{' '}
              Questions, cancellation notices and complaints can be sent to{' '}
              <a href={`mailto:${config.contactEmail}`}>
                {config.contactEmail}
              </a>
              .
            </p>
          </section>
          <section>
            <h2>Products and prices</h2>
            <div className="space-y-3">
              {products.map((product) => (
                <p key={product.id}>
                  <strong>
                    {product.name} — {productPrice(product)}.
                  </strong>{' '}
                  {product.description} {product.turnaround}.
                </p>
              ))}
            </div>
            <p>
              Prices are shown in GBP. The Stripe checkout page states the
              amount charged and, for Seller Campaign Club, that payment recurs
              monthly until cancelled.
            </p>
          </section>
          <section>
            <h2>Digital products</h2>
            <p>
              The Store Launch Kit and Campaign Club packs are supplied as
              English-language Markdown and CSV files intended for ordinary text
              editors and spreadsheet apps. Digital files are for the buyer’s
              own business use. They may be adapted internally but not resold,
              republished, shared as a template library or represented as
              someone else’s work.
            </p>
            <p>
              Where UK cancellation law applies, digital supply will not begin
              during the normal cancellation period unless the buyer expressly
              asks for immediate access and acknowledges the effect on the right
              to cancel. Statutory rights for faulty or misdescribed digital
              content are not affected.
            </p>
          </section>
          <section>
            <h2>Focused services</h2>
            <p>
              Product Page Rescue covers one public product page. Store
              Emergency Check covers one reported public-storefront issue or
              journey and one public retest after the customer’s repair. The
              customer supplies accurate public URLs and context. Storefront HQ
              supplies the described copy or diagnosis; the customer remains
              responsible for implementation, platform configuration and
              business decisions.
            </p>
            <p>
              If a consumer asks for service work to start during a statutory
              cancellation period, we will obtain the required express request
              before starting. If cancellation remains available after work has
              begun, the law may allow a proportionate charge for work supplied
              up to cancellation.
            </p>
          </section>
          <section>
            <h2>Seller Campaign Club</h2>
            <p>
              The subscription is £19 per month until cancelled. It provides the
              current member campaign pack and subsequent monthly packs while
              the subscription remains active. Cancellation stops future
              renewal; it does not remove files already lawfully supplied.
              Cancellation instructions are available through the Stripe
              customer portal or by emailing Storefront HQ. We do not impose a
              minimum term.
            </p>
          </section>
          <section>
            <h2>Refunds, cancellations and problems</h2>
            <p>
              Email Storefront HQ with the purchase email, product and Stripe
              receipt reference. We will apply mandatory consumer rights and any
              cancellation right that remains available. Nothing in these terms
              excludes rights that cannot lawfully be excluded. If work or
              content is materially different from the description, tell us
              promptly so we can investigate and provide the appropriate remedy.
            </p>
          </section>
          <section>
            <h2>Limits</h2>
            <p>
              Products provide practical templates, copy, public-storefront
              observations and implementation guidance. They are not legal, tax,
              accounting, security or accessibility-conformance advice.
              Storefront HQ does not promise a particular revenue, conversion or
              ranking result and does not require store-admin access, passwords
              or customer records.
            </p>
          </section>
          <section>
            <h2>Contract copy</h2>
            <p>
              Save or print this page and the product page before purchase.
              Stripe supplies the payment receipt. Storefront HQ supplies the
              digital files or service onboarding record after confirmed
              payment.
            </p>
          </section>
        </div>
        <p className="mt-10 text-sm text-muted-foreground">
          See also the{' '}
          <Link
            href="/privacy"
            className="font-bold underline underline-offset-4"
          >
            privacy notice
          </Link>
          .
        </p>
      </article>
      <SiteFooter />
    </main>
  );
}
