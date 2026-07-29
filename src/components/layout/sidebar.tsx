'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  MessageSquarePlus,
  Settings,
  Search,
  Trash2,
  Pencil,
  LogOut,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useApi } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Chat } from '@/lib/types';

export function Sidebar() {
  const { user, logOut } = useAuth();
  const { apiFetch } = useApi();
  const pathname = usePathname();
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const load = async (q?: string) => {
    try {
      const path = q ? `/api/chats?q=${encodeURIComponent(q)}` : '/api/chats';
      const data = await apiFetch(path);
      setChats(data.chats);
    } catch {
      /* ignore until signed in fully */
    }
  };

  useEffect(() => {
    if (user) void load(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, pathname]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (user) void load(query);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    const onChatsChanged = () => {
      if (user) void load(query);
    };
    window.addEventListener('aisheets:chats-changed', onChatsChanged);
    return () =>
      window.removeEventListener('aisheets:chats-changed', onChatsChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, query]);

  const newChat = () => {
    // Fresh draft each time; query key remounts ChatView when already on home.
    router.push(`/?new=${Date.now()}`);
  };

  const rename = async (id: string) => {
    await apiFetch(`/api/chats/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: editTitle }),
    });
    setEditingId(null);
    void load(query);
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this chat?')) return;
    await apiFetch(`/api/chats/${id}`, { method: 'DELETE' });
    if (pathname.includes(id)) router.push('/');
    void load(query);
  };

  if (collapsed) {
    return (
      <aside className="flex w-12 flex-col items-center gap-2 border-r border-zinc-200 bg-zinc-50 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <Button variant="ghost" size="icon" onClick={() => setCollapsed(false)}>
          <PanelLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={newChat}>
          <MessageSquarePlus className="h-4 w-4" />
        </Button>
      </aside>
    );
  }

  return (
    <aside className="flex w-64 flex-col border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between p-3">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          AI Sheets
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setCollapsed(true)}>
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>
      <div className="px-3">
        <Button className="w-full" onClick={newChat}>
          <MessageSquarePlus className="h-4 w-4" /> New chat
        </Button>
      </div>
      <div className="relative mt-3 px-3">
        <Search className="absolute left-5 top-2.5 h-4 w-4 text-zinc-400" />
        <Input
          className="pl-8"
          placeholder="Search chats…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <nav className="mt-2 flex-1 overflow-y-auto px-2">
        {chats.map((c) => {
          const active = pathname === `/chat/${c.id}`;
          return (
            <div
              key={c.id}
              className={cn(
                'group mb-0.5 flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm',
                active
                  ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100'
                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-900',
              )}
            >
              {editingId === c.id ? (
                <Input
                  className="h-7"
                  value={editTitle}
                  autoFocus
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => void rename(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void rename(c.id);
                  }}
                />
              ) : (
                <>
                  <Link href={`/chat/${c.id}`} className="flex-1 truncate">
                    {c.title}
                    {c.source === 'automation' && (
                      <span className="ml-1 text-[10px] text-zinc-400">auto</span>
                    )}
                  </Link>
                  <button
                    type="button"
                    className="hidden text-zinc-400 group-hover:block hover:text-zinc-700"
                    onClick={() => {
                      setEditingId(c.id);
                      setEditTitle(c.title);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="hidden text-zinc-400 group-hover:block hover:text-red-600"
                    onClick={() => void remove(c.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          );
        })}
        {!chats.length && (
          <p className="px-2 py-4 text-xs text-zinc-400">No chats yet</p>
        )}
      </nav>
      <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
        <Link
          href="/settings"
          className="mb-2 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
        >
          <Settings className="h-4 w-4" /> Settings
        </Link>
        <div className="flex items-center gap-2 px-2">
          {user?.photoURL && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.photoURL} alt="" className="h-6 w-6 rounded-full" />
          )}
          <span className="flex-1 truncate text-xs text-zinc-500">
            {user?.displayName || user?.email}
          </span>
          <Button variant="ghost" size="icon" onClick={() => void logOut()}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
