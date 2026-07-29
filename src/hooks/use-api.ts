'use client';

import { useAuth } from '@/contexts/auth-context';
import { useCallback } from 'react';

/** Authenticated fetch helper using Firebase ID token. */
export function useApi() {
  const { getIdToken } = useAuth();

  const apiFetch = useCallback(
    async (path: string, init: RequestInit = {}) => {
      const token = await getIdToken();
      if (!token) throw new Error('Not signed in');
      const headers = new Headers(init.headers);
      headers.set('Authorization', `Bearer ${token}`);
      if (init.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      const res = await fetch(path, { ...init, headers });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      if (res.status === 204) return null;
      return res.json();
    },
    [getIdToken],
  );

  return { apiFetch };
}
