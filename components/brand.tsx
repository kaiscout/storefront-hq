import type { ProductId } from '@/lib/products';

/** Original Storefront HQ artwork. Decorative where the adjacent text names it. */
export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="64" height="64" rx="19" fill="currentColor" />
      <path
        d="M14 29V47H37M50 29V33M13 26L18 16H46L51 26"
        stroke="#f8f4e8"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13 26C13 34 23 34 23 26C23 34 33 34 33 26C33 34 43 34 43 26C43 32 48 33 51 29V26H13Z"
        fill="#f8f4e8"
      />
      <path
        d="M23 47V38H32V47"
        stroke="#f8f4e8"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle
        cx="46"
        cy="45"
        r="11"
        fill="#b8d4a1"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        d="M41.5 45L44.5 48L50 42"
        stroke="#10261f"
        strokeWidth="2.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BrandSignature({ inverse = false }: { inverse?: boolean }) {
  return (
    <span
      className={`brand-signature ${inverse ? 'brand-signature-inverse' : ''}`}
    >
      <BrandMark className="brand-mark" />
      <span className="brand-wordmark">
        <span className="brand-name">
          Storefront <span className="brand-hq">HQ</span>
        </span>
        <span className="brand-tagline">Clarity for online sellers</span>
      </span>
    </span>
  );
}

export function ProductIcon({
  product,
  className = '',
}: {
  product: ProductId;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
      data-product-icon={product}
    >
      <rect
        x="3"
        y="3"
        width="58"
        height="58"
        rx="18"
        fill="currentColor"
        fillOpacity=".07"
        stroke="none"
      />
      {product === 'store-emergency-check' && (
        <>
          <rect x="13" y="15" width="34" height="30" rx="5" />
          <path d="M13 23H47M20 19H21M26 19H27" />
          <circle cx="38" cy="38" r="11" fill="#dce9cc" stroke="#294b3b" />
          <path d="M46 46L53 53M38 32V38M38 43H38.01" stroke="#294b3b" />
        </>
      )}
      {product === 'product-page-rescue' && (
        <>
          <rect x="14" y="12" width="33" height="40" rx="5" />
          <path d="M14 21H47M21 16.5H22M28 16.5H29M22 40H30M22 46H28" />
          <rect
            x="22"
            y="27"
            width="16"
            height="7"
            rx="2"
            fill="currentColor"
            fillOpacity=".15"
            stroke="none"
          />
          <path
            d="M34 43L46 31L52 37L40 49L32 51Z"
            fill="#dce9cc"
            stroke="#294b3b"
          />
          <path d="M43 34L49 40" stroke="#294b3b" />
        </>
      )}
      {product === 'store-launch-kit' && (
        <>
          <path
            d="M13 27L32 17L51 27L32 37L13 27Z"
            fill="currentColor"
            fillOpacity=".12"
          />
          <path d="M13 27V45L32 55L51 45V27M32 37V55M22 22L42 32" />
          <circle cx="45" cy="18" r="11" fill="#dce9cc" stroke="#294b3b" />
          <path d="M45 23V13M41 17L45 13L49 17" stroke="#294b3b" />
        </>
      )}
      {product === 'seller-campaign-club' && (
        <>
          <rect x="12" y="16" width="39" height="36" rx="5" />
          <path d="M12 26H51M22 12V20M41 12V20M21 34H25M21 42H25M32 34H36" />
          <circle cx="44" cy="44" r="12" fill="#dce9cc" stroke="#294b3b" />
          <path
            d="M39 43A5 5 0 0 1 48 40M49 38V42H45M49 46A5 5 0 0 1 40 49M39 51V47H43"
            stroke="#294b3b"
          />
        </>
      )}
    </svg>
  );
}
