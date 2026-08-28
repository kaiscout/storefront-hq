import { headers } from 'next/headers';

function allowedOwnerEmails() {
  return (process.env.OPS_OWNER_EMAIL ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAuthorizedOperatorEmail(email: string | null) {
  if (!email) return false;
  const normalized = email.toLowerCase();
  if (
    process.env.NODE_ENV !== 'production' &&
    normalized === 'seedy@sites.test'
  )
    return true;
  return allowedOwnerEmails().includes(normalized);
}

export async function currentOperator() {
  const requestHeaders = await headers();
  const email = requestHeaders.get('oai-authenticated-user-email');
  return { email, authorized: isAuthorizedOperatorEmail(email) };
}

export function isOperatorRequest(request: Request) {
  return isAuthorizedOperatorEmail(
    request.headers.get('oai-authenticated-user-email'),
  );
}
