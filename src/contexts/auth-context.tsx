'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { getClientAuth, googleProvider } from '@/lib/firebase/client';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  getIdToken: () => Promise<string | null>;
  signInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(getClientAuth(), (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const getIdToken = useCallback(async () => {
    if (!user) return null;
    return user.getIdToken();
  }, [user]);

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(getClientAuth(), googleProvider);
  }, []);

  const logOut = useCallback(async () => {
    await signOut(getClientAuth());
  }, []);

  const value = useMemo(
    () => ({ user, loading, getIdToken, signInWithGoogle, logOut }),
    [user, loading, getIdToken, signInWithGoogle, logOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
