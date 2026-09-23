import Link from 'next/link';
import { notFound } from 'next/navigation';

export const metadata = { title: 'Demo bag size guide | Storefront HQ', robots: { index: false, follow: false } };

export default async function DemoGuide({ params }: { params: Promise<{ version: string }> }) {
  const { version } = await params;
  if (version !== 'after') notFound();
  return <main className="min-h-screen bg-[#ece8df] px-5 py-12 text-[#10261f]"><article className="mx-auto max-w-2xl rounded-2xl bg-white p-8"><p className="text-sm font-bold uppercase text-[#477a5b]">Controlled test fixture · not a client store</p><h1 className="mt-4 text-3xl font-black">Everyday carry bag — size guide</h1><p className="mt-5 text-lg leading-8">Demo dimensions: 36 cm wide × 40 cm high. Handle drop: 25 cm. This guide applies to both Natural and Navy test variants.</p><Link href="/demo/after" className="mt-6 inline-block font-bold underline">Return to corrected test product</Link></article></main>;
}
