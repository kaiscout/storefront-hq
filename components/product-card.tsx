import { ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';

import type { StorefrontProduct } from '@/lib/products';
import { productPrice } from '@/lib/products';
import { cn } from '@/lib/utils';
import { ProductIcon } from '@/components/brand';

export function ProductCard({
  product,
  featured = false,
}: {
  product: StorefrontProduct;
  featured?: boolean;
}) {
  return (
    <article
      className={cn(
        'group relative flex h-full flex-col rounded-[1.75rem] border p-6 sm:p-7',
        featured
          ? 'border-[#10261f] bg-[#10261f] text-[#f8f4e8] shadow-xl shadow-[#10261f]/10'
          : 'border-[#10261f]/15 bg-[#fffefb] shadow-sm',
      )}
    >
      {featured ? (
        <span className="absolute -top-3 right-5 rounded-full bg-[#f2c14e] px-3 py-1 text-[10px] font-black uppercase tracking-[0.13em] text-[#10261f]">
          Best first paid step
        </span>
      ) : null}
      <ProductIcon
        product={product.id}
        className={cn(
          'mb-5 size-16',
          featured ? 'text-[#b8d4a1]' : 'text-[#294b3b]',
        )}
      />
      <p
        className={cn(
          'font-mono text-[11px] font-bold uppercase tracking-[0.16em]',
          featured ? 'text-[#a8d66d]' : 'text-[#477a5b]',
        )}
      >
        {product.eyebrow}
      </p>
      <h3 className="mt-3 text-2xl font-black tracking-[-0.035em]">
        {product.name}
      </h3>
      <p
        className={cn(
          'mt-3 text-base font-semibold leading-6',
          featured ? 'text-white' : 'text-[#10261f]',
        )}
      >
        {product.promise}
      </p>
      <p
        className={cn(
          'mt-3 text-sm leading-6',
          featured ? 'text-[#b9c6b7]' : 'text-muted-foreground',
        )}
      >
        {product.description}
      </p>
      <div className="my-6 flex items-end gap-2">
        <strong className="text-4xl font-black tracking-[-0.05em]">
          {productPrice(product)}
        </strong>
        {product.billing === 'one-time' ? (
          <span
            className={cn(
              'pb-1 text-xs',
              featured ? 'text-[#b9c6b7]' : 'text-muted-foreground',
            )}
          >
            one-time
          </span>
        ) : null}
      </div>
      <ul className="mb-7 space-y-2.5 text-sm">
        {product.features.map((feature) => (
          <li key={feature} className="flex gap-2.5">
            <Check
              className={cn(
                'mt-0.5 size-4 shrink-0',
                featured ? 'text-[#a8d66d]' : 'text-[#477a5b]',
              )}
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Link
        href={`/products/${product.id}`}
        className={cn(
          'mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-black',
          featured
            ? 'bg-[#ff6b35] text-white hover:bg-[#e95725]'
            : 'bg-[#10261f] text-white hover:bg-[#1d4539]',
        )}
      >
        See what’s included <ArrowRight className="size-4" />
      </Link>
    </article>
  );
}
