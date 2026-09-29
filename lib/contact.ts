export const businessContactEmail = 'front.storecheckqa@gmail.com';

export function sprintInquiryMailto(configuredEmail: string) {
  if (configuredEmail.trim().toLowerCase() !== businessContactEmail)
    return null;
  const subject = 'Storefront QA Sprint — fit enquiry';
  const body = [
    'I am interested in the Storefront QA Sprint. Please reply about whether my store fits the fixed scope.',
    '',
    'Public Shopify store URL:',
    'Main concern or recent change:',
    'Launch / campaign deadline, if any:',
    'Who would implement recommendations:',
    '',
    'Please use public storefront information only. I will not send passwords, customer records or admin access.',
  ].join('\n');
  return `mailto:${businessContactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function agencyInquiryMailto(configuredEmail: string) {
  if (configuredEmail.trim().toLowerCase() !== businessContactEmail)
    return null;
  const subject = 'Agency partner enquiry — Storefront QA Sprint';
  const body = [
    'I am assessing the Storefront QA Sprint for an agency project. Please reply about fit before sharing a payment link.',
    '',
    'Agency / company:',
    'Public Shopify store URL:',
    'Launch, migration or release date:',
    'Priority market and buying journey:',
    'Who would implement the recommendations:',
    'Does the fixed £895 public-storefront scope fit? Yes / Not sure',
    '',
    'Please use public storefront information only. I will not send passwords, customer records or admin access.',
  ].join('\n');
  return `mailto:${businessContactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
