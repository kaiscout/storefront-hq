/// <reference types="vite/client" />
import { headers } from 'next/headers';
import {
  accessConfigFromEnv,
  accessTokenFromHeaders,
  verifyAccessToken,
} from './cloudflare-access.ts';

function allowedOwnerEmails() {
  return (process.env.OPS_OWNER_EMAIL ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAuthorizedOperatorEmail(email: string | null) {
  if (!email) return false;
  return allowedOwnerEmails().includes(email.toLowerCase());
}

// Local development only: `vinext dev` serves with import.meta.env.DEV = true,
// which production builds replace with false, so this branch is removed there.
function devOperatorEmail() {
  if (!import.meta.env?.DEV) return null;
  return process.env.OPS_DEV_OPERATOR_EMAIL?.trim().toLowerCase() || null;
}

async function verifiedEmail(requestHeaders: Headers) {
  const devEmail = devOperatorEmail();
  if (devEmail) return devEmail;
  return verifyAccessToken(
    accessTokenFromHeaders(requestHeaders),
    accessConfigFromEnv(),
  );
}

export async function currentOperator() {
  const email = await verifiedEmail(await headers());
  return { email, authorized: isAuthorizedOperatorEmail(email) };
}

export async function isOperatorRequest(request: Request) {
  return isAuthorizedOperatorEmail(await verifiedEmail(request.headers));
}
