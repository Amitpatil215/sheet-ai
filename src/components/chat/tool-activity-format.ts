/** Human-readable labels for sheet tool calls in the chat activity UI. */

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return null;
}

function str(v: unknown): string | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  return String(v);
}

function countArray(v: unknown): number | undefined {
  return Array.isArray(v) ? v.length : undefined;
}

export interface ToolActivityView {
  title: string;
  subtitle: string;
  facts: { label: string; value: string }[];
}

const TOOL_TITLES: Record<string, string> = {
  get_sheet_schema: 'Inspect sheet layout',
  read_rows: 'Read rows',
  search_rows: 'Search sheet',
  append_rows: 'Append rows',
  update_rows: 'Update row',
  delete_rows: 'Delete rows',
  clear_range: 'Clear range',
  propose_operation: 'Propose change',
  confirm_operation: 'Confirm change',
  cancel_pending: 'Cancel pending',
};

function titleFor(name: string): string {
  return TOOL_TITLES[name] ?? name.replace(/_/g, ' ');
}

function summarizeOutput(name: string, output: unknown): string[] {
  const o = asRecord(output);
  if (!o) return [];

  const lines: string[] = [];
  if (name === 'search_rows' && Array.isArray(o.matches)) {
    lines.push(`${o.matches.length} match${o.matches.length === 1 ? '' : 'es'}`);
    const g = str(o.guidance);
    if (g) lines.push(g);
  }
  if (name === 'read_rows' && Array.isArray(o.rows)) {
    const start = str(o.startRow);
    lines.push(
      `${o.rows.length} row${o.rows.length === 1 ? '' : 's'}${start ? ` from row ${start}` : ''}`,
    );
  }
  if (name === 'get_sheet_schema') {
    const headers = o.headers;
    if (Array.isArray(headers)) {
      lines.push(`${headers.length} column${headers.length === 1 ? '' : 's'}`);
    }
    const ws = str(o.worksheet);
    const sheetTitle = str(o.title);
    if (ws) lines.push(`Worksheet: ${ws}`);
    if (sheetTitle) lines.push(`Spreadsheet: ${sheetTitle}`);
    const hr = str(o.headerRow);
    if (hr) lines.push(`Header on row ${hr}`);
  }
  if (name === 'append_rows') {
    const n = countArray(o.rows);
    if (n !== undefined) lines.push(`Appended ${n} row${n === 1 ? '' : 's'}`);
    const range = str(o.updatedRange);
    if (range) lines.push(range);
  }
  if (name === 'update_rows' && o.updated) {
    const idx = str(o.rowIndex);
    lines.push(idx ? `Updated row ${idx}` : 'Row updated');
  }
  if (name === 'delete_rows' && o.deleted !== undefined) {
    lines.push(`Deleted ${String(o.deleted)} row(s)`);
  }
  if (name === 'clear_range' && o.cleared) {
    lines.push('Range cleared');
  }
  if (name === 'propose_operation' || name === 'confirm_operation') {
    const status = str(o.status);
    const intent = str(o.intent);
    if (intent) lines.push(`Intent: ${intent}`);
    if (status) lines.push(`Status: ${status}`);
    const missing = o.missingFields;
    if (Array.isArray(missing) && missing.length) {
      lines.push(`Missing: ${missing.join(', ')}`);
    }
  }
  if (name === 'cancel_pending') {
    lines.push('Pending operation cancelled');
  }
  if (!lines.length && str(o.error)) {
    lines.push(String(o.error));
  }
  return lines;
}

function summarizeInput(name: string, input: unknown): { label: string; value: string }[] {
  const i = asRecord(input);
  if (!i) return [];

  const facts: { label: string; value: string }[] = [];
  const push = (label: string, value: unknown) => {
    const s = str(value);
    if (s) facts.push({ label, value: s });
  };

  push('Query', i.query);
  push('Worksheet', i.worksheet);
  push('Column', i.column);
  push('Range', i.range);
  push('Intent', i.intent);
  push('Start row', i.startRow);
  push('Limit', i.limit);
  push('Row', i.rowIndex);
  if (i.startIndex !== undefined && i.endIndex !== undefined) {
    push('Rows', `${i.startIndex}–${i.endIndex}`);
  }

  if (name === 'search_rows') {
    if (i.contextBefore !== undefined) push('Context before', i.contextBefore);
    if (i.contextAfter !== undefined) push('Context after', i.contextAfter);
  }

  const rowObjects = i.rowObjects;
  if (Array.isArray(rowObjects)) {
    push('Rows to write', rowObjects.length);
  } else if (Array.isArray(i.rows)) {
    push('Rows to write', i.rows.length);
  }

  const partial = i.partialRow;
  if (partial && typeof partial === 'object') {
    const keys = Object.keys(partial as object).filter((k) => !k.startsWith('_'));
    if (keys.length) {
      push('Partial row fields', keys.join(', '));
    }
  }

  const required = i.requiredFields;
  if (Array.isArray(required) && required.length) {
    push('Required fields', required.join(', '));
  }

  const connector = str(i.connectorId);
  if (connector) {
    facts.push({
      label: 'Connector',
      value: connector.length > 12 ? `${connector.slice(0, 8)}…` : connector,
    });
  }

  return facts;
}

export function formatToolActivity(
  name: string,
  input: unknown,
  output: unknown,
): ToolActivityView {
  const inputFacts = summarizeInput(name, input);
  const outputLines = summarizeOutput(name, output);

  const subtitleParts: string[] = [];
  const query = asRecord(input)?.query;
  if (query) subtitleParts.push(`"${str(query)}"`);
  const ws = str(asRecord(input)?.worksheet);
  if (ws) subtitleParts.push(ws);
  if (outputLines[0]) subtitleParts.push(outputLines[0]);

  const subtitle =
    subtitleParts.join(' · ') ||
    inputFacts
      .slice(0, 3)
      .map((f) => `${f.label}: ${f.value}`)
      .join(' · ') ||
    '—';

  const facts = [...inputFacts];
  for (const line of outputLines) {
    facts.push({ label: 'Result', value: line });
  }

  return {
    title: titleFor(name),
    subtitle,
    facts,
  };
}

/** One line for the collapsed activity strip (includes internal tool id). */
export function formatToolStripLine(
  name: string,
  input: unknown,
  output: unknown,
  state?: string,
): string {
  const { title, subtitle } = formatToolActivity(name, input, output);
  const status =
    state === 'output-error'
      ? 'failed'
      : state?.startsWith('input')
        ? 'running'
        : state === 'output-available'
          ? ''
          : '';
  const base = `${title} (${name})`;
  const tail = [subtitle !== '—' ? subtitle : null, status || null]
    .filter(Boolean)
    .join(' · ');
  return tail ? `${base} — ${tail}` : base;
}
