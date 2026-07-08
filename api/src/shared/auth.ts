import type { HttpRequest } from '@azure/functions';

export interface ClientPrincipal {
  identityProvider: string;
  userId: string;
  userDetails: string;
  userRoles: string[];
}

/** Decodes the `x-ms-client-principal` header set by SWA / Easy Auth. */
export function getPrincipal(req: HttpRequest): ClientPrincipal | null {
  const header = req.headers.get('x-ms-client-principal');
  if (!header) return null;
  try {
    const decoded = Buffer.from(header, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded) as ClientPrincipal;
    if (!parsed?.userId || !Array.isArray(parsed.userRoles)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isAuthenticated(p: ClientPrincipal | null): p is ClientPrincipal {
  return !!p && p.userRoles.includes('authenticated');
}
