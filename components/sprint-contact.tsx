import Link from 'next/link';
import { Mail } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { businessContactEmail, sprintInquiryMailto } from '@/lib/contact';
import { offer } from '@/lib/offer';
import { cn } from '@/lib/utils';

export function SprintContact({ contactEmail }: { contactEmail: string }) {
  const mailto = sprintInquiryMailto(contactEmail);
  if (!mailto) return null;

  return (
    <section
      aria-labelledby="email-fit-heading"
      className="rounded-2xl border border-[#477a5b]/30 bg-[#e9f4dc] p-5 sm:p-6"
    >
      <p className="text-sm font-bold uppercase tracking-wide text-[#477a5b]">
        Start a conversation
      </p>
      <h2
        id="email-fit-heading"
        className="mt-2 text-2xl font-black tracking-tight"
      >
        Email your store and main concern.
      </h2>
      <p className="mt-3 text-base leading-7 text-muted-foreground">
        Tell us what changed, any launch deadline, and who can implement
        recommendations. We’ll assess fit for the £{offer.priceGbp} sprint
        before a payment link is shared. No purchase commitment.
      </p>
      <a
        href={mailto}
        className={cn(
          buttonVariants({ size: 'lg' }),
          'mt-5 h-auto min-h-12 max-w-full whitespace-normal rounded-full px-5 py-3 text-center text-base font-bold',
        )}
      >
        <Mail className="size-4 shrink-0" /> Email your store + main concern
      </a>
      <p className="mt-3 text-sm leading-6">
        Opens your email app. Nothing is sent until you send it. You can also
        write to{' '}
        <span className="break-all font-semibold">{businessContactEmail}</span>.
      </p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Please do not send passwords, customer records or admin invitations.{' '}
        <Link href="/privacy" className="underline underline-offset-2">
          How we use your enquiry
        </Link>
        .
      </p>
    </section>
  );
}
