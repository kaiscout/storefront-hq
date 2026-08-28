import { assessBuyerIntent } from './pipeline.ts';
import { offer } from './offer.ts';
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

export type StorefrontFinding = {
  url: string;
  referringUrl?: string;
  title: string;
  severity: 'critical' | 'high' | 'medium';
  category: string;
  evidence: string;
  recommendation: string;
};

export type StorefrontPreflight = {
  attemptedRoutes: string[];
  pages: Array<{ requestedUrl: string; document: ScrapeDocument }>;
  failures: Array<{ url: string; error: string }>;
};

export function isSuccessfulStorefrontDocument(document: ScrapeDocument) {
  const statusCode = document.metadata?.statusCode;
  return statusCode === undefined || (statusCode >= 200 && statusCode < 400);
}

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

const blockedPreflightPaths =
  /(?:^|\/)(?:admin|account|cart|checkout|checkouts|orders|password)(?:\/|$)/i;
const nonDocumentExtensions =
  /\.(?:avif|bmp|css|csv|gif|ico|jpe?g|js|json|mp3|mp4|pdf|png|svg|txt|webm|webp|woff2?|xml|zip)$/i;

function canonicalSameOriginRoute(value: string, storefrontUrl: URL) {
  try {
    const route = new URL(value, storefrontUrl);
    if (
      route.protocol !== 'https:' ||
      route.origin !== storefrontUrl.origin ||
      route.username ||
      route.password ||
      blockedPreflightPaths.test(route.pathname) ||
      nonDocumentExtensions.test(route.pathname)
    )
      return null;
    route.hash = '';
    route.search = '';
    return route.href;
  } catch {
    return null;
  }
}

function preflightRoutePriority(value: string) {
  const pathname = new URL(value).pathname;
  if (/^\/products?\//i.test(pathname)) return 0;
  if (/^\/collections?\//i.test(pathname)) return 1;
  if (/^\/pages?\//i.test(pathname)) return 2;
  if (/^\/policies?\//i.test(pathname)) return 3;
  return 4;
}

export function selectStorefrontPreflightRoutes(
  storeUrl: string,
  seedDocument: ScrapeDocument,
  limit = 5,
) {
  const storefrontUrl = new URL(storeUrl);
  storefrontUrl.hash = '';
  storefrontUrl.search = '';
  const maximum = Math.max(1, Math.min(5, Math.floor(limit)));
  const candidates = new Set<string>();
  for (const link of seedDocument.links ?? []) {
    const route = canonicalSameOriginRoute(link, storefrontUrl);
    if (route && route !== storefrontUrl.href) candidates.add(route);
  }
  return [
    storefrontUrl.href,
    ...Array.from(candidates).sort(
      (left, right) =>
        preflightRoutePriority(left) - preflightRoutePriority(right) ||
        left.localeCompare(right),
    ),
  ].slice(0, maximum);
}

export async function runStorefrontPreflight(
  storeUrl: string,
  options?: {
    limit?: number;
    scrape?: (url: string) => Promise<ScrapeDocument>;
  },
): Promise<StorefrontPreflight> {
  const scrape = options?.scrape ?? scrapeStorefrontPreview;
  const storefrontUrl = new URL(storeUrl);
  storefrontUrl.hash = '';
  storefrontUrl.search = '';
  const attemptedRoutes = [storefrontUrl.href];
  let seedDocument: ScrapeDocument;
  try {
    seedDocument = await scrape(storefrontUrl.href);
  } catch (error) {
    return {
      attemptedRoutes,
      pages: [],
      failures: [
        {
          url: storefrontUrl.href,
          error:
            error instanceof Error ? error.message : 'Unknown scrape error',
        },
      ],
    };
  }

  const routes = selectStorefrontPreflightRoutes(
    storefrontUrl.href,
    seedDocument,
    options?.limit,
  );
  attemptedRoutes.splice(0, attemptedRoutes.length, ...routes);
  const pages: StorefrontPreflight['pages'] = [
    { requestedUrl: storefrontUrl.href, document: seedDocument },
  ];
  const failures: StorefrontPreflight['failures'] = [];
  const results = await Promise.allSettled(
    routes.slice(1).map(async (requestedUrl) => ({
      requestedUrl,
      document: await scrape(requestedUrl),
    })),
  );
  results.forEach((result, index) => {
    const url = routes[index + 1];
    if (result.status === 'fulfilled') pages.push(result.value);
    else
      failures.push({
        url,
        error:
          result.reason instanceof Error
            ? result.reason.message
            : 'Unknown scrape error',
      });
  });
  return { attemptedRoutes, pages, failures };
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
      limit: offer.pageLimit,
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

  if ((!statusCode || statusCode < 400) && !document.metadata?.title?.trim()) {
    findings.push({
      title: 'No public page title was captured',
      severity: 'medium',
      category: 'page-title',
      evidence: `${url} did not expose a non-empty page title during the public mobile check.`,
      recommendation:
        'Verify the rendered HTML title element and add a concise, page-specific title if it is missing.',
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

function normalizedDocumentUrl(document: ScrapeDocument) {
  const value = document.metadata?.sourceURL ?? document.metadata?.url;
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    url.hash = '';
    url.search = '';
    return url.href;
  } catch {
    return null;
  }
}

export function deriveCorpusFindings(documents: ScrapeDocument[]) {
  const findings: StorefrontFinding[] = [];
  const documentsByUrl = new Map<string, ScrapeDocument>();
  const urlsByTitle = new Map<string, { title: string; urls: Set<string> }>();

  for (const document of documents) {
    const url = normalizedDocumentUrl(document);
    if (!url) continue;
    documentsByUrl.set(url, document);
    const title = document.metadata?.title?.replace(/\s+/g, ' ').trim();
    if (!title || (document.metadata?.statusCode ?? 200) >= 400) continue;
    const key = title.toLocaleLowerCase('en-GB');
    const group = urlsByTitle.get(key) ?? { title, urls: new Set<string>() };
    group.urls.add(url);
    urlsByTitle.set(key, group);
  }

  for (const group of urlsByTitle.values()) {
    const urls = Array.from(group.urls).sort();
    if (urls.length < 2) continue;
    findings.push({
      url: urls[0],
      title: 'Duplicate public page title across crawled routes',
      severity: 'medium',
      category: 'duplicate-title',
      evidence: `The exact title "${group.title.slice(0, 160)}" was captured on ${urls.length} public routes: ${urls.slice(0, 5).join(', ')}.`,
      recommendation:
        'Review these routes and give each distinct page a concise, page-specific title.',
    });
  }

  const recordedLinks = new Set<string>();
  for (const [referringUrl, document] of documentsByUrl) {
    const origin = new URL(referringUrl);
    for (const link of document.links ?? []) {
      const destination = canonicalSameOriginRoute(link, origin);
      if (!destination) continue;
      const destinationDocument = documentsByUrl.get(destination);
      const statusCode = destinationDocument?.metadata?.statusCode;
      if (!statusCode || statusCode < 400) continue;
      const key = `${referringUrl}\n${destination}`;
      if (recordedLinks.has(key)) continue;
      recordedLinks.add(key);
      findings.push({
        url: destination,
        referringUrl,
        title: `Crawled internal destination returns HTTP ${statusCode}`,
        severity: statusCode >= 500 ? 'critical' : 'high',
        category: 'broken-internal-destination',
        evidence: `${referringUrl} links to ${destination}, which returned HTTP ${statusCode} in the same public crawl.`,
        recommendation:
          'Repair the destination or update the internal link to a verified live route.',
      });
    }
  }
  return findings;
}
