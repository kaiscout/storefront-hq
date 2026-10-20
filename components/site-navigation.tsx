'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';

const links = [
  ['Home', '/'],
  ['Products', '/products'],
  ['Free triage', '/triage'],
  ['Agencies', '/agency-partners'],
  ['Reviews', '/reviews'],
  ['Contact', '/contact'],
] as const;

export function SiteNavigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener('keydown', dismiss);
    return () => document.removeEventListener('keydown', dismiss);
  }, [open]);
  const active = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);
  return (
    <>
      <nav
        className="hidden items-center gap-0.5 rounded-full border border-[#10261f]/8 bg-[#f1f2e9]/70 p-1 xl:flex"
        aria-label="Main navigation"
      >
        {links.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            aria-current={active(href) ? 'page' : undefined}
            className={`rounded-full px-3 py-2.5 text-[13px] font-semibold transition-colors ${active(href) ? 'bg-white text-[#10261f] shadow-sm' : 'text-[#53655c] hover:bg-white/80 hover:text-[#10261f]'}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <Link
          href="/products/store-emergency-check"
          className="hidden items-center gap-2 rounded-full bg-[#10261f] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#294b3b] sm:inline-flex"
        >
          Check a store issue <ArrowUpRight className="size-4" />
        </Link>
        <button
          ref={menuButton}
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          aria-label={open ? 'Close navigation' : 'Open navigation'}
          className="grid size-11 place-items-center rounded-full border border-[#10261f]/20 bg-white/60 xl:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="absolute inset-x-0 top-full border-b border-[#10261f]/15 bg-[#fbfaf5] p-5 shadow-xl xl:hidden"
        >
          <div className="mx-auto grid max-w-7xl gap-1 sm:grid-cols-2">
            {links.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={active(href) ? 'page' : undefined}
                className={`rounded-xl px-4 py-3.5 font-semibold ${active(href) ? 'bg-[#e8eddf]' : 'hover:bg-[#f0eee5]'}`}
              >
                {label}
              </Link>
            ))}
            <Link
              href="/products/store-emergency-check"
              onClick={() => setOpen(false)}
              className="mt-2 flex items-center justify-between rounded-xl bg-[#10261f] px-4 py-3.5 font-bold text-white sm:col-span-2"
            >
              Store Emergency Check · £99 <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </nav>
      )}
    </>
  );
}
