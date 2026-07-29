'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useApi } from '@/hooks/use-api';
import { ChatView } from '@/components/chat/chat-view';

function DraftChat() {
  const params = useSearchParams();
  const draftKey = params.get('new') || 'draft';
  return <ChatView key={draftKey} />;
}

export default function HomePage() {
  const { user } = useAuth();
  const { apiFetch } = useApi();

  useEffect(() => {
    if (!user) return;
    void apiFetch('/api/preferences', {
      method: 'PATCH',
      body: JSON.stringify({
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      }),
    }).catch(() => {
      /* admin may not be configured yet */
    });
  }, [user, apiFetch]);

  return (
    <Suspense fallback={<div className="p-6 text-sm text-zinc-400">Loading…</div>}>
      <DraftChat />
    </Suspense>
  );
}
