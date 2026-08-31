const blockedHostnameSuffixes = ['.local', '.localhost', '.internal'];
const websiteConfirmationPrefix = 'Storefront QA confirmation';
const uuidPattern =
  '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const websiteConfirmationPattern = new RegExp(
  `^${websiteConfirmationPrefix} \\[(${uuidPattern})\\]$`,
  'i',
);

function isBlockedIpv4(hostname: string) {
  const octets = hostname.split('.').map(Number);
  if (
    octets.length !== 4 ||
    octets.some(
      (octet, index) =>
        !Number.isInteger(octet) ||
        octet < 0 ||
        octet > 255 ||
        String(octet) !== hostname.split('.')[index],
    )
  )
    return false;

  const [first, second] = octets;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first >= 224 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51) ||
    (first === 203 && second === 0)
  );
}

function isBlockedIpv6(hostname: string) {
  const normalized = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!normalized.includes(':')) return false;
  return (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb') ||
    normalized.startsWith('ff')
  );
}

export function isPublicHttpsStoreUrl(value: string) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      (url.port && url.port !== '443') ||
      !hostname.includes('.') ||
      hostname === 'localhost' ||
      blockedHostnameSuffixes.some((suffix) => hostname.endsWith(suffix)) ||
      isBlockedIpv4(hostname) ||
      isBlockedIpv6(hostname)
    )
      return false;
    return true;
  } catch {
    return false;
  }
}

export function normalizedSingleLine(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function websiteConfirmationSubject(leadId: string) {
  return `${websiteConfirmationPrefix} [${leadId}]`;
}

export function parseWebsiteConfirmationSubject(subject: string) {
  const match = websiteConfirmationPattern.exec(subject);
  return match?.[1]?.toLowerCase() ?? null;
}

export async function readRequestBodyWithinLimit(
  request: Request,
  maximumBytes: number,
) {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximumBytes) {
      await reader.cancel('Request body limit exceeded');
      return null;
    }
    chunks.push(value);
  }
  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(combined);
}

export async function intakeRateLimitKey(request: Request) {
  const forwarded = request.headers.get('cf-connecting-ip')?.trim();
  const source = forwarded || 'unknown-source';
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`storefront-intake|${source}`),
  );
  const encoded = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  return `intake-rate:${encoded}`;
}
