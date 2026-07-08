import type { BudgetMap, Category, Expense, RecurringExpense } from '../types/expense';

export interface AuthPrincipal {
  identityProvider: string;
  userId: string;
  userDetails: string;
  userRoles: string[];
}

export interface UserData {
  expenses: Expense[];
  categories: Category[];
  recurring: RecurringExpense[];
  budgets: BudgetMap;
}

export interface UserDoc {
  id?: string;
  userId: string;
  data: UserData;
  updatedAt: string | null;
}

export const authRoutes = {
  loginGitHub: '/.auth/login/github?post_login_redirect_uri=/',
  logout: '/.auth/logout?post_logout_redirect_uri=/',
};

/** Reads the current auth state from SWA's built-in `/.auth/me` endpoint. */
export async function fetchAuth(): Promise<AuthPrincipal | null> {
  try {
    const r = await fetch('/.auth/me', {
      credentials: 'include',
      headers: { accept: 'application/json' },
    });
    if (!r.ok) return null;
    const json = (await r.json()) as { clientPrincipal: AuthPrincipal | null };
    return json.clientPrincipal ?? null;
  } catch {
    return null;
  }
}

export async function fetchData(): Promise<UserDoc | null> {
  const r = await fetch('/api/data', {
    credentials: 'include',
    headers: { accept: 'application/json' },
  });
  if (r.status === 401) return null;
  if (!r.ok) throw new Error(`GET /api/data failed: ${r.status}`);
  return (await r.json()) as UserDoc;
}

export async function putData(data: UserData): Promise<{ updatedAt: string }> {
  const r = await fetch('/api/data', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ data }),
  });
  if (!r.ok) throw new Error(`PUT /api/data failed: ${r.status}`);
  return (await r.json()) as { updatedAt: string };
}
