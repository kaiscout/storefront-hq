// Verifies Cloudflare Access application tokens (RS256 JWTs).
//
// Cloudflare Access sits in front of the operator routes and forwards a signed
// `Cf-Access-Jwt-Assertion` header. Plain identity headers are never trusted:
// anyone can send them to a Worker directly. Only a token signed by the team's
// Access keys, issued for this application's audience tag, and still in date
// yields an email.

export type AccessConfig = {
  /** Team domain, e.g. `storefronthq.cloudflareaccess.com`. */
  teamDomain: string;
  /** Application Audience (AUD) tag from the Access application. */
  audience: string;
};

type Jwk = JsonWebKey & { kid?: string };
type CertsResponse = { keys?: Jwk[] };
type FetchLike = (input: string) => Promise<Response>;

const CERT_CACHE_MS = 60 * 60 * 1000;
const CLOCK_SKEW_SECONDS = 60;
let certCache: { issuer: string; keys: Jwk[]; fetchedAt: number } | null = null;

export function accessConfigFromEnv(
  env: Record<string, string | undefined> = process.env,
): AccessConfig | null {
  const teamDomain = (env.CF_ACCESS_TEAM_DOMAIN ?? '')
    .trim()
    .replace(/^https:\/\//, '')
    .replace(/\/+$/, '')
    .toLowerCase();
  const audience = (env.CF_ACCESS_AUD ?? '').trim();
  if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(teamDomain) || !audience)
    return null;
  return { teamDomain, audience };
}

function base64UrlBytes(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1)
    bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function decodeJsonPart(value: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(
      new TextDecoder().decode(base64UrlBytes(value)),
    );
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

async function signingKeys(
  issuer: string,
  fetcher: FetchLike,
  now: number,
  forceRefresh: boolean,
) {
  if (
    !forceRefresh &&
    certCache &&
    certCache.issuer === issuer &&
    now - certCache.fetchedAt < CERT_CACHE_MS
  )
    return certCache.keys;
  const response = await fetcher(`${issuer}/cdn-cgi/access/certs`);
  if (!response.ok) throw new Error(`Access certs HTTP ${response.status}`);
  const body = (await response.json()) as CertsResponse;
  const keys = Array.isArray(body.keys) ? body.keys : [];
  certCache = { issuer, keys, fetchedAt: now };
  return keys;
}

export function resetAccessKeyCache() {
  certCache = null;
}

/**
 * Returns the verified, lower-cased email from a Cloudflare Access token, or
 * null when the token is missing, malformed, unsigned, expired or for another
 * application.
 */
export async function verifyAccessToken(
  token: string | null | undefined,
  config: AccessConfig | null,
  options: { fetcher?: FetchLike; nowMs?: number } = {},
): Promise<string | null> {
  if (!token || !config) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerPart, payloadPart, signaturePart] = parts;
  const header = decodeJsonPart(headerPart);
  const payload = decodeJsonPart(payloadPart);
  if (!header || !payload) return null;
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') return null;

  const nowMs = options.nowMs ?? Date.now();
  const nowSeconds = Math.floor(nowMs / 1000);
  const issuer = `https://${config.teamDomain}`;
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (payload.iss !== issuer || !audiences.includes(config.audience))
    return null;
  if (
    typeof payload.exp !== 'number' ||
    payload.exp + CLOCK_SKEW_SECONDS < nowSeconds
  )
    return null;
  if (
    typeof payload.nbf === 'number' &&
    payload.nbf - CLOCK_SKEW_SECONDS > nowSeconds
  )
    return null;
  if (typeof payload.email !== 'string' || !payload.email.includes('@'))
    return null;

  const fetcher = options.fetcher ?? ((url: string) => fetch(url));
  let jwk: Jwk | undefined;
  try {
    jwk = (await signingKeys(issuer, fetcher, nowMs, false)).find(
      (key) => key.kid === header.kid,
    );
    // Access rotates keys; refresh once when the kid is unknown.
    if (!jwk)
      jwk = (await signingKeys(issuer, fetcher, nowMs, true)).find(
        (key) => key.kid === header.kid,
      );
  } catch {
    return null;
  }
  if (!jwk || jwk.kty !== 'RSA') return null;

  try {
    const { kid: _kid, ...keyData } = jwk;
    const key = await crypto.subtle.importKey(
      'jwk',
      { ...keyData, alg: 'RS256', ext: true },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      base64UrlBytes(signaturePart),
      new TextEncoder().encode(`${headerPart}.${payloadPart}`),
    );
    return valid ? payload.email.trim().toLowerCase() : null;
  } catch {
    return null;
  }
}

/** Reads the Access token from the forwarded header, then the Access cookie. */
export function accessTokenFromHeaders(headers: Headers) {
  const header = headers.get('cf-access-jwt-assertion');
  if (header) return header.trim();
  const cookie = headers.get('cookie') ?? '';
  for (const part of cookie.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === 'CF_Authorization' && rest.length) return rest.join('=');
  }
  return null;
}
