import { z } from 'zod';

import { getLead, listFindings, transitionLead } from '@/lib/database';
import { offer } from '@/lib/offer';
import { isOperatorRequest } from '@/lib/operator-auth';
import { pipelineStatuses } from '@/lib/pipeline';
import { isEvidencePackReady, toEvidenceFindings } from '@/lib/report';
import { hasAutomationSecret } from '@/lib/security';

const transitionSchema = z.object({
  status: z.enum(pipelineStatuses),
  nextAction: z.string().trim().max(500).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isOperatorRequest(request) && !hasAutomationSecret(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const parsed = transitionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json({ error: 'Invalid transition' }, { status: 400 });
  try {
    const { id } = await context.params;
    if (parsed.data.status === 'delivered') {
      const lead = await getLead(id);
      if (!lead || lead.status !== 'fulfilling')
        return Response.json(
          { error: 'Only an active audit can be marked delivered' },
          { status: 409 },
        );
      const readiness = isEvidencePackReady(
        toEvidenceFindings(await listFindings(id)),
        offer.selectedFindings,
      );
      if (!readiness.ready)
        return Response.json(
          {
            error: `Delivery requires ${offer.selectedFindings} complete, fix-ready findings; ${readiness.complete} are ready`,
          },
          { status: 409 },
        );
    }
    const lead = await transitionLead(id, parsed.data.status, {
      nextAction: parsed.data.nextAction,
    });
    return Response.json({ ok: true, lead });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Transition failed' },
      { status: 409 },
    );
  }
}
