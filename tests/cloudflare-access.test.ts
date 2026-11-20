import test from 'node:test';
import assert from 'node:assert/strict';

import {
  accessConfigFromEnv,
  accessTokenFromHeaders,
  resetAccessKeyCache,
  verifyAccessToken,
} from '../lib/cloudflare-access.ts';

const config = {
  teamDomain: 'storefronthq.cloudflareaccess.com',
  audience: 'aud-tag-123',
};
const issuer = `https://${config.teamDomain}`;
const nowMs = Date.UTC(2026, 10, 20, 12, 0, 0);
const nowSeconds = Math.floor(nowMs / 1000);

function base64Url(bytes: Uint8Array | string) {
  const data =
    typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes;
  let binary = '';
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function keyPair() {
  return crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  );
}

async function sign(
  privateKey: CryptoKey,
  payload: Record<string, unknown>,
  header: Record<string, unknown> = { alg: 'RS256', kid: 'key-1', typ: 'JWT' },
) {
  const input = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(input),
  );
  return `${input}.${base64Url(new Uint8Array(signature))}`;
}

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    iss: issuer,
    aud: [config.audience],
    email: 'Owner@Example.com',
    iat: nowSeconds - 10,
    nbf: nowSeconds - 10,
    exp: nowSeconds + 3600,
    ...overrides,
  };
}

async function setup() {
  resetAccessKeyCache();
  const pair = await keyPair();
  const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  const requested: string[] = [];
  const fetcher = async (url: string) => {
    requested.push(url);
    return new Response(JSON.stringify({ keys: [{ ...jwk, kid: 'key-1' }] }));
  };
  return { pair, fetcher, requested };
}

void test('accepts a correctly signed Access token and returns its email', async () => {
  const { pair, fetcher, requested } = await setup();
  const token = await sign(pair.privateKey, validPayload());
  assert.equal(
    await verifyAccessToken(token, config, { fetcher, nowMs }),
    'owner@example.com',
  );
  assert.deepEqual(requested, [`${issuer}/cdn-cgi/access/certs`]);
});

void test('rejects forged, expired, wrong-audience and wrong-issuer tokens', async () => {
  const { pair, fetcher } = await setup();
  const other = await keyPair();
  const cases = [
    await sign(other.privateKey, validPayload()),
    await sign(pair.privateKey, validPayload({ exp: nowSeconds - 3600 })),
    await sign(pair.privateKey, validPayload({ nbf: nowSeconds + 3600 })),
    await sign(pair.privateKey, validPayload({ aud: ['another-app'] })),
    await sign(
      pair.privateKey,
      validPayload({ iss: 'https://evil.cloudflareaccess.com' }),
    ),
    await sign(pair.privateKey, validPayload({ email: undefined })),
    await sign(pair.privateKey, validPayload(), { alg: 'none', kid: 'key-1' }),
    await sign(pair.privateKey, validPayload(), { alg: 'RS256', kid: 'nope' }),
  ];
  for (const token of cases)
    assert.equal(
      await verifyAccessToken(token, config, { fetcher, nowMs }),
      null,
    );
});

void test('tampering with the payload invalidates the signature', async () => {
  const { pair, fetcher } = await setup();
  const [header, , signature] = (
    await sign(pair.privateKey, validPayload())
  ).split('.');
  const forgedPayload = base64Url(
    JSON.stringify(validPayload({ email: 'attacker@example.com' })),
  );
  assert.equal(
    await verifyAccessToken(`${header}.${forgedPayload}.${signature}`, config, {
      fetcher,
      nowMs,
    }),
    null,
  );
});

void test('fails closed without configuration, token or reachable keys', async () => {
  const { pair } = await setup();
  const token = await sign(pair.privateKey, validPayload());
  assert.equal(await verifyAccessToken(token, null, { nowMs }), null);
  assert.equal(await verifyAccessToken(null, config, { nowMs }), null);
  assert.equal(await verifyAccessToken('not.a.jwt', config, { nowMs }), null);
  // The offline network guard makes the default fetch throw.
  assert.equal(await verifyAccessToken(token, config, { nowMs }), null);
});

void test('reads configuration strictly from the environment', () => {
  assert.deepEqual(
    accessConfigFromEnv({
      CF_ACCESS_TEAM_DOMAIN: 'https://StorefrontHQ.cloudflareaccess.com/',
      CF_ACCESS_AUD: ' aud-tag-123 ',
    }),
    config,
  );
  assert.equal(
    accessConfigFromEnv({
      CF_ACCESS_TEAM_DOMAIN: 'evil.example.com',
      CF_ACCESS_AUD: 'x',
    }),
    null,
  );
  assert.equal(accessConfigFromEnv({ CF_ACCESS_TEAM_DOMAIN: '' }), null);
});

void test('ignores plain identity headers and reads only Access tokens', () => {
  const spoofed = new Headers({
    'oai-authenticated-user-email': 'owner@example.com',
    'cf-access-authenticated-user-email': 'owner@example.com',
  });
  assert.equal(accessTokenFromHeaders(spoofed), null);
  assert.equal(
    accessTokenFromHeaders(new Headers({ 'cf-access-jwt-assertion': 'a.b.c' })),
    'a.b.c',
  );
  assert.equal(
    accessTokenFromHeaders(
      new Headers({ cookie: 'theme=dark; CF_Authorization=x.y.z' }),
    ),
    'x.y.z',
  );
});
