import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(name: string): string {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9\s-_]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

/** Extract spreadsheet ID from a Google Sheets URL or raw ID. */
export function parseSpreadsheetId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match?.[1] ?? null;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export const DEFAULT_MODEL = 'openai/gpt-4o-mini';

export const MODEL_OPTIONS = [
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
  { id: 'openai/gpt-4o', label: 'GPT-4o' },
  { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
  { id: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash' },
  { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B' },
] as const;

export const PERMISSION_LABELS: Record<string, string> = {
  read: 'Read only',
  read_insert: 'Read + Insert',
  read_insert_update: 'Read + Insert + Update',
  full_crud: 'Full CRUD',
};
