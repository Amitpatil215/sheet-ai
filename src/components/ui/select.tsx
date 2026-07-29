import { cn } from '@/lib/utils';
import type { SelectHTMLAttributes } from 'react';

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'flex h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
