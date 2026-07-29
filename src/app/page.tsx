'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useApi } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const { user, loading } = useAuth();
  const { apiFetch } = useApi();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    void (async () => {
      // Ensure user profile exists
      try {
        await apiFetch('/api/preferences', {
          method: 'PATCH',
          body: JSON.stringify({
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
          }),
        });
      } catch {
        /* admin may not be configured yet */
      }
      const chat = await apiFetch('/api/chats', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      router.replace(`/chat/${chat.id}`);
    })();
  }, [user, loading, router, apiFetch]);

  return (
    <div className="flex h-screen items-center justify-center text-sm text-zinc-500">
      Starting AI Sheets…
      {!loading && !user && (
        <Button className="ml-3" onClick={() => router.push('/login')}>
          Sign in
        </Button>
      )}
    </div>
  );
}
