'use client';

import { useMemo, useRef } from 'react';
import type { Connector, PromptTemplate } from '@/lib/types';

interface Props {
  connectors: Connector[];
  value: string;
  onChange: (v: string) => void;
  onSelectConnector: (c: Connector) => void;
  templates: PromptTemplate[];
  onTemplate: (body: string) => void;
  onSubmit?: () => void;
}

/** Composer @-mention autocomplete for connectors. */
export function MentionPopover({
  connectors,
  value,
  onChange,
  onSelectConnector,
  templates,
  onTemplate,
  onSubmit,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const mention = useMemo(() => {
    const m = value.match(/(^|\s)@([a-zA-Z0-9-]*)$/);
    if (!m) return null;
    return { filter: m[2] ?? '', atStart: value.lastIndexOf('@') };
  }, [value]);

  const filtered = useMemo(() => {
    if (!mention) return [];
    const filter = mention.filter.toLowerCase();
    return connectors.filter(
      (c) =>
        c.enabled &&
        (c.slug.includes(filter) || c.name.toLowerCase().includes(filter)),
    );
  }, [connectors, mention]);

  const pick = (c: Connector) => {
    if (!mention) return;
    const before = value.slice(0, mention.atStart);
    const after = value.slice(mention.atStart).replace(/^@[a-zA-Z0-9-]*/, '');
    onChange(`${before}@${c.slug}${after} `);
    onSelectConnector(c);
    ref.current?.focus();
  };

  return (
    <div className="relative">
      {templates.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTemplate(t.promptBody)}
              className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
            >
              {t.title}
            </button>
          ))}
        </div>
      )}
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
          if (e.shiftKey) return; // Shift+Enter → new line
          e.preventDefault();
          onSubmit?.();
        }}
        rows={3}
        placeholder="Message AI Sheets… Type @ to tag a connector"
        className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
      />
      {mention && filtered.length > 0 && (
        <ul className="absolute bottom-full left-0 z-20 mb-1 max-h-48 w-64 overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {filtered.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => pick(c)}
              >
                <span className="font-medium">@{c.slug}</span>
                <span className="text-xs text-zinc-500">{c.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Parse @slugs from message text into connector ids. */
export function parseTaggedConnectors(
  text: string,
  connectors: Connector[],
): string[] {
  const slugs = [...text.matchAll(/@([a-zA-Z0-9-]+)/g)].map((m) =>
    m[1]!.toLowerCase(),
  );
  const ids = new Set<string>();
  for (const slug of slugs) {
    const c = connectors.find((x) => x.slug.toLowerCase() === slug);
    if (c) ids.add(c.id);
  }
  return [...ids];
}
