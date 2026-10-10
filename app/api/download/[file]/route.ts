import { getCommerceOrder } from '@/lib/database';
import { getDigitalAsset } from '@/lib/digital-products';
import { getProduct } from '@/lib/products';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const sessionId =
    new URL(request.url).searchParams.get('session_id')?.trim() ?? '';
  if (!/^cs_live_[A-Za-z0-9_-]{8,255}$/.test(sessionId))
    return new Response('A valid paid session is required.', { status: 403 });
  const order = await getCommerceOrder(sessionId);
  const product = order ? getProduct(order.product_id) : null;
  if (!order || order.outcome !== 'cleared_expected' || !product)
    return new Response('Payment is not confirmed.', {
      status: 403,
      headers: { 'Cache-Control': 'no-store' },
    });
  const asset = getDigitalAsset(product.id, (await params).file);
  if (!asset) return new Response('File not found.', { status: 404 });
  return new Response(asset.body, {
    headers: {
      'Content-Type': asset.contentType,
      'Content-Disposition': `attachment; filename="${asset.filename}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
