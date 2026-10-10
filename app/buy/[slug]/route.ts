import { checkoutUrlForProduct } from '@/lib/config';
import { getProduct } from '@/lib/products';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const product = getProduct((await params).slug);
  if (!product) return new Response('Product not found', { status: 404 });
  const url = checkoutUrlForProduct(product.id);
  if (!url)
    return Response.redirect(
      new URL(`/start?product=${product.id}&checkout=unavailable`, request.url),
      303,
    );
  return Response.redirect(url, 303);
}
