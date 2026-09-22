export type ScheduledResearchKind = 'discovery' | 'source-watch';

// Deliberately has no network, database, or Firecrawl dependencies. Compatibility
// endpoints acknowledge timer calls without pretending a public check happened.
export function createDeferredResearchHandler(
  kind: ScheduledResearchKind,
  isAuthorized: (request: Request) => boolean,
) {
  return async function POST(request: Request) {
    if (!isAuthorized(request))
      return Response.json({ error: 'Unauthorized' }, { status: 401 });

    return Response.json({
      ok: true,
      skipped: true,
      reasonCode: 'scheduled_research_disabled',
      policy: 'ordinary-web-first',
      firecrawlInvoked: false,
      checked: 0,
      ...(kind === 'discovery'
        ? {
            deferred: true,
            found: 0,
            saved: 0,
            reason:
              'Scheduled Firecrawl discovery is disabled. The business monitor performs one ordinary-web discovery pass per UTC day and records evidence before manual discovery intake.',
          }
        : {
            deferred: [],
            targets: null,
            creditStatus: null,
            baselines: 0,
            changed: [],
            failures: [],
            reason:
              'Recurring Firecrawl source scraping is disabled. The six-hour business monitor reviews existing public conversations with ordinary web tools; no source content or snapshots were checked by this call.',
          }),
    });
  };
}
