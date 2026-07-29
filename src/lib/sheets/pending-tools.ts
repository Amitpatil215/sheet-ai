import { tool } from 'ai';
import { z } from 'zod';
import type { PendingOperation } from '@/lib/types';
import {
  appendRows,
  updateRows,
  deleteRows,
  headersFor,
  alignRowsToSheet,
} from './writes';
import { nowIso } from '@/lib/utils';
import { resolve, guard, type ToolContext } from './tool-helpers';

export function createPendingTools(ctx: ToolContext) {
  return {
    propose_operation: tool({
      description:
        'Propose incomplete insert/update/delete after get_sheet_schema. requiredFields must be exact header names.',
      inputSchema: z.object({
        connectorId: z.string(),
        intent: z.enum(['insert', 'update', 'delete']),
        partialRow: z.record(z.string(), z.unknown()),
        requiredFields: z.array(z.string()),
      }),
      execute: async ({ connectorId, intent, partialRow, requiredFields }) => {
        const c = resolve(ctx, connectorId);
        guard(c, 'propose_operation');
        const ws = c.defaultWorksheet || 'Sheet1';
        const headersResult = await headersFor(ctx.uid, c.spreadsheetId, ws);
        const headers = headersResult.headers;
        if (!headers.length || headers.every((h) => !h.trim())) {
          throw new Error(
            'Sheet has no headers. Ask the user how to structure columns before proposing a write.',
          );
        }
        const headerSet = new Set(headers.map((h) => h.toLowerCase()));
        const normalizedRequired = requiredFields.length
          ? requiredFields
          : headers.filter((h) => h.trim());
        const bad = normalizedRequired.filter(
          (f) => !f.startsWith('_') && !headerSet.has(f.toLowerCase()),
        );
        if (bad.length) {
          throw new Error(
            `requiredFields must match headers. Invalid: [${bad.join(', ')}]. Use: ${headers.join(', ')}`,
          );
        }
        const missing = normalizedRequired.filter(
          (f) =>
            partialRow[f] === undefined ||
            partialRow[f] === '' ||
            partialRow[f] === null,
        );
        const pending: PendingOperation = {
          connectorId,
          intent,
          partialRow,
          requiredFields: normalizedRequired,
          missingFields: missing,
          createdAt: nowIso(),
        };
        ctx.setPending(pending);
        return {
          status: missing.length ? 'awaiting_fields' : 'ready',
          missingFields: missing,
          headers,
          headerRow: headersResult.headerRow,
          pending,
        };
      },
    }),
    confirm_operation: tool({
      description: 'Execute the pending operation once all required fields are present',
      inputSchema: z.object({
        additionalFields: z.record(z.string(), z.unknown()).optional(),
      }),
      execute: async ({ additionalFields }) => {
        if (!ctx.pending) throw new Error('No pending operation');
        const c = resolve(ctx, ctx.pending.connectorId);
        guard(c, 'confirm_operation');
        const merged = { ...ctx.pending.partialRow, ...(additionalFields ?? {}) };
        const missing = ctx.pending.requiredFields.filter(
          (f) => merged[f] === undefined || merged[f] === '' || merged[f] === null,
        );
        if (missing.length) {
          ctx.setPending({
            ...ctx.pending,
            partialRow: merged,
            missingFields: missing,
          });
          return { status: 'awaiting_fields', missingFields: missing };
        }
        const ws = c.defaultWorksheet || 'Sheet1';
        if (ctx.pending.intent === 'insert') {
          const aligned = await alignRowsToSheet(ctx.uid, c.spreadsheetId, ws, [
            merged,
          ]);
          const result = await appendRows(
            ctx.uid,
            c.spreadsheetId,
            ws,
            aligned.values,
          );
          ctx.setPending(null);
          return {
            status: 'committed',
            intent: 'insert',
            result,
            headers: aligned.headers,
          };
        }
        if (ctx.pending.intent === 'update') {
          const rowIndex = Number(merged._rowIndex);
          if (!rowIndex) throw new Error('Update requires _rowIndex in partialRow');
          const aligned = await alignRowsToSheet(ctx.uid, c.spreadsheetId, ws, [
            merged,
          ]);
          const result = await updateRows(
            ctx.uid,
            c.spreadsheetId,
            ws,
            rowIndex,
            aligned.values[0]!,
          );
          ctx.setPending(null);
          return {
            status: 'committed',
            intent: 'update',
            result,
            headers: aligned.headers,
          };
        }
        const startIndex = Number(merged._rowIndex);
        if (!startIndex) throw new Error('Delete requires _rowIndex');
        const result = await deleteRows(
          ctx.uid,
          c.spreadsheetId,
          ws,
          startIndex,
          startIndex,
        );
        ctx.setPending(null);
        return { status: 'committed', intent: 'delete', result };
      },
    }),
    cancel_pending: tool({
      description: 'Cancel the pending multi-turn operation',
      inputSchema: z.object({}),
      execute: async () => {
        ctx.setPending(null);
        return { status: 'cancelled' };
      },
    }),
  };
}
