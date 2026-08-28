import { deleteFinding, getLead } from '@/lib/database';
import { isOperatorRequest } from '@/lib/operator-auth';

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; findingId: string }> },
) {
  if (!isOperatorRequest(request))
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, findingId } = await context.params;
  const lead = await getLead(id);
  if (!lead || !['paid', 'fulfilling'].includes(lead.status))
    return Response.json(
      { error: 'Findings can be removed only from an active paid audit' },
      { status: 409 },
    );
  const deleted = await deleteFinding(id, findingId);
  return Response.json({ ok: true, deleted });
}
