const encoder = new TextEncoder();

function toHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

export async function hmacSha256(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return toHex(await crypto.subtle.sign('HMAC', key, encoder.encode(payload)));
}

export function constantTimeEqual(left: string, right: string) {
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1)
    mismatch |= a[index] ^ b[index];
  return mismatch === 0;
}

export async function verifyHexHmac(
  secret: string,
  payload: string,
  provided: string | null,
) {
  if (!secret || !provided) return false;
  const normalized = provided.startsWith('sha256=')
    ? provided.slice(7)
    : provided;
  const expected = await hmacSha256(secret, payload);
  return constantTimeEqual(expected, normalized);
}

export async function verifyStripeSignature(
  secret: string,
  payload: string,
  header: string | null,
  toleranceSeconds = 300,
) {
  if (!secret || !header) return false;
  const pairs = header.split(',').map((part) => part.split('=', 2));
  const timestamp = pairs.find(([key]) => key === 't')?.[1];
  const signatures = pairs
    .filter(([key]) => key === 'v1')
    .map(([, value]) => value);
  if (!timestamp || signatures.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > toleranceSeconds)
    return false;
  const expected = await hmacSha256(secret, `${timestamp}.${payload}`);
  return signatures.some((signature) => constantTimeEqual(expected, signature));
}

export function hasAutomationSecret(request: Request) {
  const expected = process.env.AUTOMATION_SECRET;
  if (!expected) return false;
  const supplied =
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  return constantTimeEqual(expected, supplied);
}
