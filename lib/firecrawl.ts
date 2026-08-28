import { assessBuyerIntent } from './pipeline.ts';
import { sha256Hex } from './security.ts';

const API_BASE = 'https://api.firecrawl.dev/v2';

type SearchResult = {
  title?: string;
  description?: string;
  url?: string;
  markdown?: string;
  date?: string;
  metadata?: {
    sourceURL?: string;
    url?: string;
    title?: string;
    description?: string;
    date?: string;
    publishedDate?: string;
    statusCode?: number;
  };
};

export type ScrapeDocument = {
  markdown?: string;
  links?: string[];
  screenshot?: string;
  metadata?: {
    sourceURL?: string;
    url?: string;
    title?: string;
    description?: string;
    statusCode?: number;
  };
};

async function firecrawlFetch<T>(path: string, body: unknown): Promise<T> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error('FIRECRAWL_API_KEY is not configured');
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`Firecrawl ${path} failed (${response.status}): ${detail}`);
  }
  return (await response.json()) as T;
}

export async function discoverExplicitIntent() {
  const query =
    '(Shopify OR ecommerce OR storefront) ("looking for" OR "seeking" OR "need help" OR "can anyone help" OR "proposals") (QA OR testing OR audit OR "broken links" OR CRO OR BFCM OR "Black Friday" OR "store speed") -career -careers -salary -"job description" -"how to"';
  const response = await firecrawlFetch<{
    success: boolean;
    data?: { web?: SearchResult[] };
  }>('/search', {
    query,
    limit: 25,
    sources: ['web'],
    tbs: 'qdr:w,sbd:1',
    country: 'UK',
    ignoreInvalidURLs: true,
    scrapeOptions: { formats: [{ type: 'markdown' }], onlyMainContent: true },
  });

  return (response.data?.web ?? [])
    .map((result) => {
      const url =
        result.url ?? result.metadata?.sourceURL ?? result.metadata?.url ?? '';
      const title =
        result.title ?? result.metadata?.title ?? 'Untitled opportunity';
      const description =
        result.description ??
        result.metadata?.description ??
        result.markdown?.slice(0, 800) ??
        '';
      const assessment = assessBuyerIntent({
        url,
        title,
        description,
        markdown: result.markdown,
        publishedDate:
          result.date ??
          result.metadata?.date ??
          result.metadata?.publishedDate,
      });
      if (!assessment.accepted) return null;
      return {
        url,
        title,
        description,
        score: assessment.score,
        reasons: assessment.reasons,
        contactChannel: assessment.contactChannel,
        contactEmail: assessment.contactEmail,
        publishedAt: assessment.publishedAt,
        recencyRank: assessment.recencyRank,
      };
    })
    .filter((result): result is NonNullable<typeof result> => result !== null)
    .sort(
      (left, right) =>
        right.recencyRank - left.recencyRank ||
        right.score - left.score ||
        left.url.localeCompare(right.url),
    )
    .map(({ recencyRank: _recencyRank, ...result }) => result);
}

export async function scrapeStorefrontPreview(url: string) {
  const response = await firecrawlFetch<{
    success: boolean;
    data?: ScrapeDocument;
  }>('/scrape', {
    url,
    formats: ['markdown', 'links', 'screenshot'],
    onlyMainContent: false,
    mobile: true,
    blockAds: true,
    removeBase64Images: true,
    timeout: 45_000,
    location: { country: 'GB', languages: ['en-GB'] },
  });
  if (!response.data)
    throw new Error('Firecrawl returned no storefront document');
  return response.data;
}

export async function startFullAudit(input: {
  leadId: string;
  storeUrl: string;
  webhookUrl: string;
}) {
  return firecrawlFetch<{ success: boolean; id: string; url: string }>(
    '/crawl',
    {
      url: input.storeUrl,
      limit: 250,
      sitemap: 'include',
      ignoreQueryParameters: true,
      crawlEntireDomain: true,
      allowExternalLinks: false,
      maxConcurrency: 2,
      delay: 0.5,
      scrapeOptions: {
        formats: ['markdown', 'links', 'screenshot'],
        onlyMainContent: false,
        mobile: true,
        blockAds: true,
        removeBase64Images: true,
        location: { country: 'GB', languages: ['en-GB'] },
      },
      webhook: {
        url: input.webhookUrl,
        events: ['started', 'page', 'completed', 'failed'],
        metadata: { leadId: input.leadId },
      },
    },
  );
}

export async function getCrawl(id: string) {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error('FIRECRAWL_API_KEY is not configured');
  const response = await fetch(`${API_BASE}/crawl/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok)
    throw new Error(`Firecrawl crawl retrieval failed (${response.status})`);
  return (await response.json()) as {
    status: string;
    completed?: number;
    total?: number;
    data?: ScrapeDocument[];
  };
}

export async function storefrontSnapshot(document: ScrapeDocument) {
  const normalizedMarkdown = (document.markdown ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200_000);
  const normalizedLinks = [...(document.links ?? [])]
    .map((link) => link.replace(/[?#].*$/, ''))
    .sort()
    .slice(0, 2_000);
  const statusCode = document.metadata?.statusCode;
  const pageTitle = document.metadata?.title?.trim();
  return {
    contentHash: await sha256Hex(
      JSON.stringify({ normalizedMarkdown, normalizedLinks, statusCode }),
    ),
    statusCode,
    pageTitle,
  };
}

export function deriveDeterministicFindings(document: ScrapeDocument) {
  const markdown = document.markdown ?? '';
  const url = document.metadata?.sourceURL ?? document.metadata?.url ?? '';
  const statusCode = document.metadata?.statusCode;
  const findings: Array<{
    title: string;
    severity: 'critical' | 'high' | 'medium';
    category: string;
    evidence: string;
    recommendation: string;
  }> = [];

  if (statusCode && statusCode >= 400) {
    findings.push({
      title: `Public route returns HTTP ${statusCode}`,
      severity: statusCode >= 500 ? 'critical' : 'high',
      category: 'broken-route',
      evidence: `${url} returned status ${statusCode} during a mobile public-storefront check.`,
      recommendation:
        'Repair the destination or redirect every internal reference to a live equivalent.',
    });
  }

  if (
    /\b(sold out|out of stock|unavailable)\b/i.test(markdown) &&
    /\b(shop now|buy now|add to cart)\b/i.test(markdown)
  ) {
    findings.push({
      title: 'Unavailable merchandise is paired with a purchase CTA',
      severity: 'medium',
      category: 'availability-copy',
      evidence: `${url} contains both unavailable-product language and an active purchase call to action.`,
      recommendation:
        'Confirm the rendered state, then hide or rewrite the CTA when the selected variant is unavailable.',
    });
  }

  return findings;
}
