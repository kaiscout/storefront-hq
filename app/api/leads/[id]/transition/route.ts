import { z } from 'zod';

import { transitionLead } from '@/lib/database';
import { isOperatorRequest } from '@/lib/operator-auth';
import { pipelineStatuses } from '@/lib/pipeline';
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
