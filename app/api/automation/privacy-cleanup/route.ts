import { runPrivacyRetentionCleanup } from '@/lib/database';
import { hasAutomationSecret } from '@/lib/security';
import { pruneWebsiteSubmissions } from '@/lib/website-database';

export async function POST(request: Request) {
  if (!hasAutomationSecret(request))
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await pruneWebsiteSubmissions();
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
