'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

export function Markdown({ content }: { content: string }) {
  return (
    <div
      className={cn(
        'prose prose-sm max-w-none dark:prose-invert',
        'prose-pre:bg-zinc-900 prose-pre:text-zinc-100',
        'prose-code:rounded prose-code:bg-zinc-100 prose-code:px-1 dark:prose-code:bg-zinc-800',
        'prose-table:text-xs',
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
