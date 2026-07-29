'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Sidebar } from '@/components/layout/sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-zinc-500">
        Loading…
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top,_#ecfdf5_0%,_transparent_55%),linear-gradient(180deg,#fafafa,#f4f4f5)] dark:bg-[radial-gradient(ellipse_at_top,_#064e3b33_0%,_transparent_50%),linear-gradient(180deg,#09090b,#18181b)]">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col bg-white/70 backdrop-blur-sm dark:bg-zinc-950/70">
        {children}
      </main>
    </div>
  );
}
