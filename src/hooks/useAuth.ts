import { useEffect, useState } from 'react';
import { fetchAuth, type AuthPrincipal } from '../lib/api';

export type AuthState =
  | { status: 'loading' }
  | { status: 'guest' }
  | { status: 'authenticated'; principal: AuthPrincipal };

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetchAuth()
      .then((p) => {
        if (cancelled) return;
        if (p && p.userRoles?.includes('authenticated')) {
          setState({ status: 'authenticated', principal: p });
        } else {
          setState({ status: 'guest' });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'guest' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
