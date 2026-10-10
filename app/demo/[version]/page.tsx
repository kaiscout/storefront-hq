import { notFound } from 'next/navigation';
import { DemoStorefront } from '@/components/demo-storefront';

export const metadata = {
  title: 'Controlled QA demonstration | Storefront HQ',
  robots: { index: false, follow: false },
};

export default async function DemoPage({
  params,
}: {
  params: Promise<{ version: string }>;
}) {
  const { version } = await params;
  if (!['before', 'after'].includes(version)) notFound();
  return <DemoStorefront corrected={version === 'after'} />;
}
