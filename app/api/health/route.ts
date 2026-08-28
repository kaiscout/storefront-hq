import { integrationState } from '@/lib/config';

export async function GET() {
  return Response.json({ ok: true, integrations: integrationState() });
}
