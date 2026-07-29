import type { Connector, PendingOperation } from '@/lib/types';

export function buildSystemPrompt(
  connectors: Connector[],
  pending: PendingOperation | null,
): string {
  const lines: string[] = [
    'You are AI Sheets, an assistant that helps users work with Google Spreadsheets via named connectors.',
    'Only use tools against connectors listed below.',
    '',
    '## Sheet format rules (mandatory)',
    '1. Before ANY insert, update, delete, or search-and-edit: call get_sheet_schema first.',
    '2. get_sheet_schema inspects the first 4 rows and picks the header row (see headerRow / previewRows).',
    '3. Study headers and sampleRows. New rows MUST use the same columns, order, and value style.',
    '4. Prefer append_rows / updates with row objects keyed by exact header names (not guessed columns).',
    '5. Match formats from sampleRows (dates, currency, booleans, empty cells). Do not invent extra columns.',
    '6. If the sheet is empty (no headers), ask the user how to structure it before writing.',
    '7. For incomplete inserts/updates: after schema, call propose_operation with requiredFields = header names still missing.',
    '8. When the user fills gaps, call confirm_operation with additionalFields.',
    '9. If the user says never mind / cancel, call cancel_pending.',
    '10. If no connectors are available at all, refuse mutations. Otherwise auto-select the best connector for the user intent.',
    '11. Be concise. Format tabular answers in markdown.',
    '',
    '## Lookup rules (mandatory)',
    '12. Sheets often use section/label rows (dates, categories, people, statuses, etc.). The label may appear once; related items live in nearby rows until the next label.',
    '13. For any lookup: call search_rows and read the `around` window for each match. Never answer from the matched row alone when neighboring rows hold the content.',
    '14. If search_rows returns 0 matches, retry with a shorter/partial query (unique substring) and/or read_rows near likely areas. Do NOT tell the user nothing exists after a single failed exact search.',
    '15. When listing items for a label/section, include rows in the match window that belong to that section (typically below the label until the next similar label).',
  ];

  if (!connectors.length) {
    lines.push(
      'No connectors are available. Answer without sheet tools unless the user is continuing a pending operation.',
    );
  } else {
    lines.push('Available connectors:');
    for (const c of connectors) {
      lines.push(
        `- id=${c.id} name="${c.name}" slug=@${c.slug} spreadsheetId=${c.spreadsheetId} worksheet=${c.defaultWorksheet || 'Sheet1'} permission=${c.permission}`,
      );
      if (c.description) lines.push(`  description: ${c.description}`);
      if (c.systemPrompt) lines.push(`  instructions: ${c.systemPrompt}`);
    }
    lines.push('');
    lines.push(
      '## Auto-selection rule: If the user did not explicitly tag a connector, infer the best connector from their intent using the connector name, description, and worksheet context. If ambiguous, ask the user which connector to use.',
    );
  }

  if (pending) {
    lines.push(
      `Active pending operation: intent=${pending.intent} connectorId=${pending.connectorId} missing=[${pending.missingFields.join(', ')}] partial=${JSON.stringify(pending.partialRow)}`,
    );
    lines.push(
      'Continue collecting missing fields using existing header names; do not start a new unrelated write unless the user cancels.',
    );
  }

  return lines.join('\n');
}
