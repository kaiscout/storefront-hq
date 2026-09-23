export const businessContactEmail = 'front.storecheckqa@gmail.com';

export function sprintInquiryMailto(configuredEmail: string) {
  if (configuredEmail.trim().toLowerCase() !== businessContactEmail) return null;
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
