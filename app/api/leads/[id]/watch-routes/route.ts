import { z } from 'zod';

import { getLead, replaceWatchRoutes } from '@/lib/database';
import { isOperatorRequest } from '@/lib/operator-auth';

const routesSchema = z.object({
  routes: z.array(z.url().refine((url) => url.startsWith('https://'))).max(10),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isOperatorRequest(request))
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = routesSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: 'Provide no more than 10 HTTPS routes' },
      { status: 400 },
    );
  const { id } = await context.params;
  const lead = await getLead(id);
  if (
    !lead?.store_url ||
    !['paid', 'fulfilling', 'delivered'].includes(lead.status)
  )
    return Response.json(
      { error: 'Watch routes can be set only for a paid storefront' },
      { status: 409 },
    );

  const storeOrigin = new URL(lead.store_url).origin;
  const routes = Array.from(
    new Set(
      parsed.data.routes.map((value) => {
        const url = new URL(value);
        url.hash = '';
        return url.toString();
      }),
    ),
  );
  if (routes.some((route) => new URL(route).origin !== storeOrigin))
    return Response.json(
      { error: 'Every watch route must use the verified storefront origin' },
      { status: 400 },
    );
  await replaceWatchRoutes(id, routes);
  return Response.json({ ok: true, routes });
}
