'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useRef, useState } from 'react';
import { Send, Loader2, X } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useApi } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Markdown } from '@/components/chat/markdown';
import {
  MentionPopover,
  parseTaggedConnectors,
} from '@/components/chat/mention-popover';
import { ChatEmpty } from '@/components/chat/chat-empty';
import { MODEL_OPTIONS } from '@/lib/utils';
import type { Chat, ChatMessage, Connector, PromptTemplate } from '@/lib/types';

interface Props {
  /** Omit for a draft chat — persisted only after the first message. */
  chatId?: string;
  initialChat?: Chat;
  initialMessages?: ChatMessage[];
}

export function ChatView({ chatId, initialChat, initialMessages = [] }: Props) {
  const { getIdToken } = useAuth();
  const { apiFetch } = useApi();
  const draftChatId = useRef<string | null>(null);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [selected, setSelected] = useState<Connector[]>([]);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [input, setInput] = useState('');
  const [model, setModel] = useState(initialChat?.model || '');
  const [pending, setPending] = useState(initialChat?.pendingOperation ?? null);
  const [creating, setCreating] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [title, setTitle] = useState(initialChat?.title || 'New chat');

  useEffect(() => {
    let cancelled = false;
    void apiFetch('/api/connectors').then((d) => {
      if (!cancelled) setConnectors(d.connectors);
    });
    return () => {
      cancelled = true;
    };
  }, [apiFetch]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const all: PromptTemplate[] = [];
      for (const c of selected) {
        try {
          const d = await apiFetch(`/api/connectors/${c.id}/templates`);
          all.push(...d.templates);
        } catch {
          /* ignore */
        }
      }
      if (!cancelled) setTemplates(all);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [selected, apiFetch]);

  const resolvedChatId = () => chatId || draftChatId.current;

  const { messages, sendMessage, status, error, clearError } = useChat({
    id: chatId || 'draft',
    transport: new DefaultChatTransport({
      api: '/api/chat',
      headers: async () => {
        const token = await getIdToken();
        return { Authorization: `Bearer ${token}` };
      },
    }),
    messages: initialMessages.map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      parts: m.parts as { type: 'text'; text: string }[],
    })),
    onFinish: async () => {
      clearError();
      const id = resolvedChatId();
      if (!id) return;
      window.dispatchEvent(
        new CustomEvent('aisheets:chats-changed', { detail: { id } }),
      );
      try {
        const d = await apiFetch(`/api/chats/${id}`);
        setPending(d.chat.pendingOperation ?? null);
        if (d.chat?.title) setTitle(d.chat.title);
      } catch {
        /* ignore */
      }
    },
  });

  const busy = status === 'submitted' || status === 'streaming' || creating;

  const onSubmit = async () => {
    if (!input.trim() || busy) return;
    clearError();
    setSubmitError(null);
    const text = input;
    const tagged = parseTaggedConnectors(text, connectors);
    const chips = selected.map((c) => c.id);
    const connectorIds = [...new Set([...tagged, ...chips])];
    setInput('');
    if (title === 'New chat' && text.trim()) {
      setTitle(text.trim().slice(0, 60));
    }

    let id = resolvedChatId();
    if (!id) {
      setCreating(true);
      try {
        const chat = await apiFetch('/api/chats', {
          method: 'POST',
          body: JSON.stringify({ model: model || undefined }),
        });
        id = chat.id as string;
        draftChatId.current = id;
        // Stay on the draft page — any route change remounts and kills streaming.
      } catch (e) {
        setInput(text);
        setSubmitError(e instanceof Error ? e.message : 'Could not create chat');
        return;
      } finally {
        setCreating(false);
      }
    }

    await sendMessage(
      { text },
      {
        body: {
          chatId: id,
          connectorIds,
          model: model || undefined,
        },
      },
    );
  };

  const cancelPending = async () => {
    const id = resolvedChatId();
    if (!id) return;
    await apiFetch(`/api/chats/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ pendingOperation: null }),
    });
    setPending(null);
  };

  const lastMessage = messages[messages.length - 1];
  const displayError =
    submitError ||
    (error && lastMessage?.role !== 'assistant' ? error.message : null);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
        <h1 className="truncate text-sm font-medium">{title}</h1>
        <Select
          className="w-48"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        >
          <option value="">Default model</option>
          {MODEL_OPTIONS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </Select>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-6">
        {!messages.length && (
          <ChatEmpty
            connectors={connectors}
            onPick={(c) => {
              setSelected([c]);
              setInput(`@${c.slug} `);
            }}
          />
        )}
        {messages.map((m) => {
          const text = (m.parts ?? [])
            .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
            .map((p) => p.text)
            .join('\n');
          return (
            <div
              key={m.id}
              className={
                m.role === 'user' ? 'ml-auto max-w-[80%] text-right' : 'max-w-[85%]'
              }
            >
              <div
                className={
                  m.role === 'user'
                    ? 'inline-block rounded-2xl bg-emerald-600 px-4 py-2 text-left text-sm text-white'
                    : 'rounded-2xl bg-zinc-100 px-4 py-3 text-sm dark:bg-zinc-900'
                }
              >
                {m.role === 'user' ? text : <Markdown content={text} />}
              </div>
            </div>
          );
        })}
        {busy && (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
          </div>
        )}
      </div>

      {displayError && (
        <div className="mx-4 mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {displayError}
        </div>
      )}

      {pending && (
        <div className="mx-4 mb-2 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          <span>
            Pending {pending.intent}: missing{' '}
            {pending.missingFields.join(', ') || 'none (ready)'}
          </span>
          <Button variant="ghost" size="sm" onClick={() => void cancelPending()}>
            <X className="h-3.5 w-3.5" /> Cancel
          </Button>
        </div>
      )}

      {selected.length > 0 && (
        <div className="mx-4 mb-1 flex flex-wrap gap-1">
          {selected.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800"
            >
              @{c.slug}
              <button
                type="button"
                onClick={() => setSelected((s) => s.filter((x) => x.id !== c.id))}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
        <MentionPopover
          connectors={connectors}
          value={input}
          onChange={setInput}
          onSelectConnector={(c) =>
            setSelected((s) => (s.find((x) => x.id === c.id) ? s : [...s, c]))
          }
          templates={templates}
          onTemplate={(body) => setInput((v) => (v ? `${v}\n${body}` : body))}
          onSubmit={() => void onSubmit()}
        />
        <div className="mt-2 flex justify-end">
          <Button onClick={() => void onSubmit()} disabled={busy || !input.trim()}>
            <Send className="h-4 w-4" /> Send
          </Button>
        </div>
      </div>
    </div>
  );
}
