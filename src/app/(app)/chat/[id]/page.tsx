'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useApi } from '@/hooks/use-api';
import { ChatView } from '@/components/chat/chat-view';
import type { Chat, ChatMessage } from '@/lib/types';

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const { apiFetch } = useApi();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void apiFetch(`/api/chats/${params.id}`)
      .then((d) => {
        if (cancelled) return;
        setChat(d.chat);
        setMessages(d.messages);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.id, apiFetch]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-400">
        Loading chat…
      </div>
    );
  }

  if (error || !chat) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-red-500">
        {error || 'Chat not found'}
      </div>
    );
  }

  return (
    <ChatView
      key={chat.id}
      chatId={chat.id}
      initialChat={chat}
      initialMessages={messages}
    />
  );
}
