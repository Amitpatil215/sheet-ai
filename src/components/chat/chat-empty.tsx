'use client';

import type { Connector } from '@/lib/types';

export function ChatEmpty({
  connectors,
  onPick,
}: {
  connectors: Connector[];
  onPick: (c: Connector) => void;
}) {
  const enabled = connectors.filter((c) => c.enabled);
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h2 className="text-xl font-semibold tracking-tight">AI Sheets</h2>
      <p className="mt-2 text-sm text-zinc-500">
        Tag a connector with @ and ask to read, insert, update, or delete rows.
      </p>
      {enabled.length > 0 ? (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {enabled.slice(0, 6).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c)}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              @{c.slug}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-zinc-400">
          Add a connector in Settings to get started.
        </p>
      )}
    </div>
  );
}
