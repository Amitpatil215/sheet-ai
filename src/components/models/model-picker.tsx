'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Loader2, Search } from 'lucide-react';
import { useApi } from '@/hooks/use-api';
import { cn, DEFAULT_MODEL, FALLBACK_MODELS } from '@/lib/utils';
import type { OpenRouterModel } from '@/lib/openrouter/fetch-models';

interface Props {
  value: string;
  onChange: (modelId: string) => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
  className?: string;
  id?: string;
}

function fallbackModels(): OpenRouterModel[] {
  return FALLBACK_MODELS.map((m) => ({ id: m.id, name: m.label }));
}

export function ModelPicker({
  value,
  onChange,
  allowEmpty,
  emptyLabel = 'Default model',
  className,
  id,
}: Props) {
  const { apiFetch } = useApi();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setHint(null);
    try {
      const d = await apiFetch('/api/openrouter/models');
      setModels(d.models ?? fallbackModels());
      if (d.error) setHint(d.error);
    } catch {
      setModels(fallbackModels());
      setHint('Using a short fallback list. Check your OpenRouter key in Settings.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
    else setQuery('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const catalog = useMemo(() => {
    const map = new Map<string, OpenRouterModel>();
    for (const m of models) map.set(m.id, m);
    if (value && !map.has(value)) map.set(value, { id: value, name: value });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [models, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog.slice(0, 80);
    return catalog
      .filter(
        (m) =>
          m.id.toLowerCase().includes(q) ||
          m.name.toLowerCase().includes(q) ||
          m.description?.toLowerCase().includes(q),
      )
      .slice(0, 80);
  }, [catalog, query]);

  const label = useMemo(() => {
    if (allowEmpty && !value) return emptyLabel;
    return catalog.find((m) => m.id === value)?.name || value || DEFAULT_MODEL;
  }, [allowEmpty, catalog, emptyLabel, value]);

  const pick = (modelId: string) => {
    onChange(modelId);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-full min-w-48 items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-left text-sm shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
      >
        <span className="truncate">{label}</span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 flex w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-center gap-2 border-b border-zinc-100 px-2 py-2 dark:border-zinc-800">
            <Search className="h-4 w-4 shrink-0 text-zinc-400" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search models…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
            />
            {loading && <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />}
          </div>
          {hint && (
            <p className="border-b border-zinc-100 px-3 py-1.5 text-[11px] text-amber-700 dark:border-zinc-800 dark:text-amber-300">
              {hint}
            </p>
          )}
          <ul className="max-h-64 overflow-y-auto py-1">
            {allowEmpty && (
              <li>
                <button
                  type="button"
                  onClick={() => pick('')}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800',
                    !value && 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
                  )}
                >
                  {emptyLabel}
                </button>
              </li>
            )}
            {filtered.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => pick(m.id)}
                  className={cn(
                    'w-full px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800',
                    value === m.id &&
                      'bg-emerald-50 dark:bg-emerald-950',
                  )}
                >
                  <div className="truncate text-sm font-medium">{m.name}</div>
                  <div className="truncate text-[11px] text-zinc-500">{m.id}</div>
                </button>
              </li>
            ))}
            {!loading && !filtered.length && (
              <li className="px-3 py-4 text-center text-sm text-zinc-400">
                No models match your search.
              </li>
            )}
            {!query.trim() && catalog.length > 80 && (
              <li className="px-3 py-2 text-[11px] text-zinc-400">
                Showing 80 of {catalog.length}. Search to narrow results.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
