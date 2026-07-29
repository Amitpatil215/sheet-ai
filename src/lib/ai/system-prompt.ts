import type { Connector, PendingOperation } from '@/lib/types';

export function buildSystemPrompt(
  connectors: Connector[],
  pending: PendingOperation | null,
): string {
  const lines: string[] = [
    'You are AI Sheets, an assistant that helps users work with Google Spreadsheets via named connectors.',
    'Only use tools against connectors listed below. Prefer reading schema before writing.',
    'For incomplete inserts/updates, call propose_operation with requiredFields and partial data, then ask the user only for missing fields.',
    'When the user provides missing values, call confirm_operation with additionalFields.',
    'If the user says never mind / cancel, call cancel_pending.',
    'Refuse mutations when no connectors are tagged. Plain Q&A without tools is allowed.',
    'Be concise. Format tabular answers in markdown.',
  ];

  if (!connectors.length) {
    lines.push('No connectors are tagged for this turn. Answer without sheet tools unless the user is continuing a pending operation.');
  } else {
    lines.push('Tagged connectors:');
    for (const c of connectors) {
      lines.push(
        `- id=${c.id} name="${c.name}" slug=@${c.slug} spreadsheetId=${c.spreadsheetId} worksheet=${c.defaultWorksheet || 'Sheet1'} permission=${c.permission}`,
      );
      if (c.description) lines.push(`  description: ${c.description}`);
      if (c.systemPrompt) lines.push(`  instructions: ${c.systemPrompt}`);
    }
  }

  if (pending) {
    lines.push(
      `Active pending operation: intent=${pending.intent} connectorId=${pending.connectorId} missing=[${pending.missingFields.join(', ')}] partial=${JSON.stringify(pending.partialRow)}`,
    );
    lines.push('Continue collecting missing fields; do not start a new unrelated write unless the user cancels.');
  }

  return lines.join('\n');
}
