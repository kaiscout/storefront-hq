import { runPrivacyRetentionCleanup } from '@/lib/database';
import { hasAutomationSecret } from '@/lib/security';

export async function POST(request: Request) {
  if (!hasAutomationSecret(request))
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return Response.json({
      ok: true,
      ...(await runPrivacyRetentionCleanup()),
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Privacy cleanup could not run',
      },
      { status: 500 },
    );
  }
}
