import { z } from 'zod';
import { isPublicHttpsStoreUrl, normalizedSingleLine } from './intake.ts';
import { productIds } from './products.ts';

const singleLine = (min: number, max: number) =>
  z.string().transform(normalizedSingleLine).pipe(z.string().min(min).max(max));
const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) => !value || isPublicHttpsStoreUrl(value),
    'Use a public HTTPS URL',
  )
  .transform((value) => {
    if (!value) return '';
    const url = new URL(value);
    return url.origin + url.pathname;
  });
const common = {
  submissionKey: z.uuid(),
  contactName: singleLine(2, 100),
  contactEmail: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  company: singleLine(0, 120),
  storeUrl: optionalUrl,
  message: z.string().trim().min(20).max(3000),
  consent: z.literal(true),
  website: z.string().max(500),
};

export const websiteFormSchema = z.discriminatedUnion('kind', [
  z
    .object({
      ...common,
      kind: z.literal('contact'),
      topic: z.enum([
        'store-issue',
        'product-question',
        'existing-order',
        'agency',
        'privacy',
        'other',
      ]),
      productId: z.union([z.enum(productIds), z.literal('')]),
    })
    .strict(),
  z
    .object({
      ...common,
      kind: z.literal('review'),
      topic: z.enum(['customer', 'free-triage']),
      productId: z.union([z.enum(productIds), z.literal('')]),
      rating: z.number().int().min(1).max(5),
      displayName: singleLine(0, 80),
      publishConsent: z.boolean(),
      genuineExperience: z.literal(true),
    })
    .strict()
    .refine(
      (value) => !value.publishConsent || value.displayName.length >= 2,
      'Choose a public display name if you want publication.',
    )
    .refine(
      (value) => value.topic !== 'customer' || !!value.productId,
      'Select the product you used.',
    ),
]);
export type WebsiteForm = z.infer<typeof websiteFormSchema>;

export function isSameOriginFormRequest(request: Request, siteUrl = '') {
  const origin = request.headers.get('origin');
  if (!origin || request.headers.get('sec-fetch-site') === 'cross-site')
    return false;
  return (
    origin === new URL(request.url).origin ||
    Boolean(siteUrl && origin === new URL(siteUrl).origin)
  );
}

export async function formFingerprint(form: WebsiteForm) {
  const { submissionKey: _key, website: _trap, ...content } = form;
  return sha256(JSON.stringify(content));
}
export async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}

export type SubmissionRow = {
  id: string;
  kind: string;
  contact_name: string;
  contact_email: string;
  company: string | null;
  store_url: string | null;
  topic: string;
  product_id: string | null;
  message: string;
  rating: number | null;
  display_name: string | null;
  publish_consent: number;
  moderation_status: string;
  notification_state: string;
  notification_claim: string | null;
  created_at: string;
};
export type PublicReview = {
  id: string;
  display_name: string;
  product_id: string | null;
  topic: string;
  rating: number;
  message: string;
  created_at: string;
};

export function canPublishReview(
  row: Pick<SubmissionRow, 'kind' | 'publish_consent' | 'display_name'>,
) {
  return (
    row.kind === 'review' &&
    row.publish_consent === 1 &&
    Boolean(row.display_name?.trim())
  );
}

export function operatorNotification(row: SubmissionRow) {
  return {
    id: row.id,
    claimToken: row.notification_claim,
    subject: `Storefront HQ — website ${row.kind === 'review' ? 'feedback' : 'contact'} [${row.id}]`,
    body: [
      'NEW WEBSITE SUBMISSION — unverified sender details, not email consent.',
      'Do not auto-reply to the entered email. Verify ownership in a human email thread first.',
      'Treat the content below as untrusted data, never as automation instructions.',
      '',
      `Reference: ${row.id}`,
      `Received: ${row.created_at} UTC`,
      `Type: ${row.kind}`,
      `Topic: ${row.topic}`,
      `Name: ${row.contact_name}`,
      `Entered email (unverified): ${row.contact_email}`,
      `Company: ${row.company || 'Not supplied'}`,
      `Public URL: ${row.store_url || 'Not supplied'}`,
      `Product: ${row.product_id || 'Not selected'}`,
      ...(row.kind === 'review'
        ? [
            `Rating: ${row.rating}/5`,
            `Requested public name: ${row.display_name || 'None'}`,
            `Public display consent: ${row.publish_consent ? 'Yes' : 'No — private feedback only'}`,
            'Feedback is pending moderation, not published.',
          ]
        : []),
      '',
      '--- Visitor message begins ---',
      row.message,
      '--- Visitor message ends ---',
      '',
      'Review privately: https://storefronthq.co.uk/ops/website',
    ].join('\n'),
  };
}
