'use client';

import { useState } from 'react';
import { ChevronRight, Loader2, Wrench } from 'lucide-react';
import { getToolName, isToolUIPart, type UIMessage } from 'ai';
import { cn } from '@/lib/utils';

type Part = UIMessage['parts'][number];

function stateLabel(state: string | undefined): string {
  if (!state) return '';
  if (state === 'output-available') return 'done';
  if (state === 'output-error') return 'error';
  if (state.startsWith('input')) return 'running';
  return state;
}

function previewJson(value: unknown, max = 1200): string {
  try {
    const s = JSON.stringify(value, null, 2);
    if (!s) return '—';
    return s.length > max ? `${s.slice(0, max)}\n…` : s;
  } catch {
    return String(value);
  }
}

function toolEntries(parts: Part[]) {
  const tools: {
    key: string;
    name: string;
    state?: string;
    input?: unknown;
    output?: unknown;
    errorText?: string;
  }[] = [];
  const reasoning: string[] = [];

  for (const part of parts) {
    if (part.type === 'reasoning' && 'text' in part && part.text?.trim()) {
      reasoning.push(part.text);
      continue;
    }
    if (isToolUIPart(part)) {
      tools.push({
        key: part.toolCallId,
        name: getToolName(part),
        state: part.state,
        input: 'input' in part ? part.input : undefined,
        output: 'output' in part ? part.output : undefined,
        errorText: 'errorText' in part ? part.errorText : undefined,
      });
      continue;
    }
    // Legacy persisted shapes
    const any = part as { type: string; toolName?: string; toolCallId?: string; args?: unknown; result?: unknown };
    if (any.type === 'tool-call') {
      tools.push({
        key: any.toolCallId || `call-${tools.length}`,
        name: any.toolName || 'tool',
        state: 'input-available',
        input: any.args,
      });
    } else if (any.type === 'tool-result') {
      const existing = tools.find((t) => t.key === any.toolCallId);
      if (existing) {
        existing.output = any.result;
        existing.state = 'output-available';
      } else {
        tools.push({
          key: any.toolCallId || `result-${tools.length}`,
          name: any.toolName || 'tool',
          state: 'output-available',
          output: any.result,
        });
      }
    }
  }

  return { tools, reasoning };
}

export function MessageActivity({ parts }: { parts: Part[] | undefined }) {
  const [open, setOpen] = useState(false);
  const { tools, reasoning } = toolEntries(parts ?? []);
  if (!tools.length && !reasoning.length) return null;

  const names = tools.map((t) => t.name);
  const running = tools.some((t) => stateLabel(t.state) === 'running');
  const summary = [
    tools.length ? `${tools.length} tool${tools.length === 1 ? '' : 's'}` : null,
    reasoning.length ? 'reasoning' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="mb-2 overflow-hidden rounded-lg border border-zinc-200/80 bg-white/60 text-xs dark:border-zinc-700/80 dark:bg-zinc-950/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900"
      >
        <ChevronRight
          className={cn('h-3.5 w-3.5 shrink-0 transition-transform', open && 'rotate-90')}
        />
        {running ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-emerald-600" />
        ) : (
          <Wrench className="h-3.5 w-3.5 shrink-0" />
        )}
        <span className="font-medium text-zinc-600 dark:text-zinc-300">{summary}</span>
        {names.length > 0 && (
          <span className="truncate text-zinc-400">{names.join(', ')}</span>
        )}
      </button>

      {open && (
        <div className="space-y-2 border-t border-zinc-200 px-2.5 py-2 dark:border-zinc-800">
          {reasoning.map((text, i) => (
            <details key={`r-${i}`} className="rounded-md bg-zinc-50 dark:bg-zinc-900">
              <summary className="cursor-pointer px-2 py-1.5 text-zinc-500">
                Reasoning
              </summary>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap px-2 pb-2 text-[11px] text-zinc-600 dark:text-zinc-400">
                {text}
              </pre>
            </details>
          ))}
          {tools.map((t) => {
            const label = stateLabel(t.state);
            return (
              <details key={t.key} className="rounded-md bg-zinc-50 dark:bg-zinc-900">
                <summary className="flex cursor-pointer items-center gap-2 px-2 py-1.5">
                  <span className="font-mono text-zinc-700 dark:text-zinc-200">
                    {t.name}
                  </span>
                  {label && (
                    <span
                      className={cn(
                        'rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide',
                        label === 'done' &&
                          'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
                        label === 'running' &&
                          'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
                        label === 'error' &&
                          'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
                      )}
                    >
                      {label}
                    </span>
                  )}
                </summary>
                <div className="space-y-2 px-2 pb-2">
                  {t.input !== undefined && (
                    <div>
                      <div className="mb-0.5 text-[10px] uppercase text-zinc-400">
                        Input
                      </div>
                      <pre className="max-h-40 overflow-auto rounded bg-zinc-100 p-1.5 text-[11px] text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                        {previewJson(t.input)}
                      </pre>
                    </div>
                  )}
                  {t.output !== undefined && (
                    <div>
                      <div className="mb-0.5 text-[10px] uppercase text-zinc-400">
                        Output
                      </div>
                      <pre className="max-h-40 overflow-auto rounded bg-zinc-100 p-1.5 text-[11px] text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                        {previewJson(t.output)}
                      </pre>
                    </div>
                  )}
                  {t.errorText && (
                    <div className="text-red-600 dark:text-red-400">{t.errorText}</div>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
