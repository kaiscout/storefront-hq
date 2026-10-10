export const businessContactEmail = 'front.storecheckqa@gmail.com';

export function sprintInquiryMailto(configuredEmail: string) {
  if (configuredEmail.trim().toLowerCase() !== businessContactEmail)
    return null;
  const subject = 'Storefront HQ — product enquiry';
  const body = [
    'I am interested in a Storefront HQ product. Please reply about the narrowest suitable option.',
    '',
    'Public Shopify store URL:',
    'Product I am considering:',
    'Main problem or recent change:',
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
  const subject = 'Agency enquiry — Storefront HQ focused services';
  const body = [
    'I am assessing a focused Storefront HQ service for an agency project. Please reply about fit before sharing a payment link.',
    '',
    'Agency / company:',
    'Public Shopify store URL:',
    'Launch, migration or release date:',
    'Priority market and buying journey:',
    'Who would implement the recommendations:',
    'Which focused product appears to fit? Product Page Rescue / Store Emergency Check / Not sure',
    '',
    'Please use public storefront information only. I will not send passwords, customer records or admin access.',
  ].join('\n');
  return `mailto:${businessContactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
