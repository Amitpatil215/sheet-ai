import { tool } from 'ai';
import { z } from 'zod';
import type { Connector, PendingOperation } from '@/lib/types';
import { canUseTool, permissionRefusal } from './permissions';
import { getSheetSchema, readRows, searchRows } from './reads';
import {
  appendRows,
  updateRows,
  deleteRows,
  clearRange,
  headersFor,
  alignRowsToSheet,
} from './writes';
import { nowIso } from '@/lib/utils';

export interface ToolContext {
  uid: string;
  connectors: Map<string, Connector>;
  pending: PendingOperation | null;
  setPending: (p: PendingOperation | null) => void;
}

function resolve(ctx: ToolContext, connectorId: string) {
  const c = ctx.connectors.get(connectorId);
  if (!c) throw new Error(`Unknown connector: ${connectorId}`);
  if (!c.enabled) throw new Error(`Connector "${c.name}" is disabled`);
  return c;
}

function guard(c: Connector, toolName: string) {
  if (!canUseTool(c.permission, toolName)) {
    throw new Error(permissionRefusal(c.permission, toolName));
  }
}

export function createSheetsTools(ctx: ToolContext) {
  return {
    get_sheet_schema: tool({
      description:
        'REQUIRED before any write. Returns headers, sampleRows, columnFormats, and format guidance.',
      inputSchema: z.object({
        connectorId: z.string(),
        worksheet: z.string().optional(),
      }),
      execute: async ({ connectorId, worksheet }) => {
        const c = resolve(ctx, connectorId);
        guard(c, 'get_sheet_schema');
        return getSheetSchema(ctx.uid, c.spreadsheetId, worksheet || c.defaultWorksheet);
      },
    }),
    read_rows: tool({
      description: 'Read rows from a worksheet (existing data)',
      inputSchema: z.object({
        connectorId: z.string(),
        worksheet: z.string().optional(),
        startRow: z.number().optional(),
        limit: z.number().optional(),
      }),
      execute: async ({ connectorId, worksheet, startRow, limit }) => {
        const c = resolve(ctx, connectorId);
        guard(c, 'read_rows');
        const ws = worksheet || c.defaultWorksheet || 'Sheet1';
        return readRows(ctx.uid, c.spreadsheetId, ws, startRow, limit);
      },
    }),
    search_rows: tool({
      description: 'Search existing rows by text query',
      inputSchema: z.object({
        connectorId: z.string(),
        query: z.string(),
        worksheet: z.string().optional(),
        column: z.string().optional(),
      }),
      execute: async ({ connectorId, query, worksheet, column }) => {
        const c = resolve(ctx, connectorId);
        guard(c, 'search_rows');
        const ws = worksheet || c.defaultWorksheet || 'Sheet1';
        return searchRows(ctx.uid, c.spreadsheetId, ws, query, column);
      },
    }),
    append_rows: tool({
      description:
        'Append rows matching existing headers. Prefer rowObjects keyed by exact header names. Call get_sheet_schema first.',
      inputSchema: z.object({
        connectorId: z.string(),
        worksheet: z.string().optional(),
        rowObjects: z
          .array(z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])))
          .optional()
          .describe('Preferred: objects keyed by header names'),
        rows: z
          .array(z.array(z.string()))
          .optional()
          .describe('Legacy: cell arrays in header order'),
      }),
      execute: async ({ connectorId, worksheet, rowObjects, rows }) => {
        const c = resolve(ctx, connectorId);
        guard(c, 'append_rows');
        const ws = worksheet || c.defaultWorksheet || 'Sheet1';
        const input = rowObjects?.length ? rowObjects : rows;
        if (!input?.length) {
          throw new Error('Provide rowObjects (preferred) or rows');
        }
        const aligned = await alignRowsToSheet(ctx.uid, c.spreadsheetId, ws, input);
        const result = await appendRows(ctx.uid, c.spreadsheetId, ws, aligned.values);
        return { ...result, headers: aligned.headers };
      },
    }),
    update_rows: tool({
      description:
        'Update a row by 1-based row index. Prefer rowObject keyed by headers. Call get_sheet_schema first.',
      inputSchema: z.object({
        connectorId: z.string(),
        rowIndex: z.number(),
        worksheet: z.string().optional(),
        rowObject: z
          .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
          .optional(),
        values: z.array(z.string()).optional(),
      }),
      execute: async ({ connectorId, rowIndex, values, rowObject, worksheet }) => {
        const c = resolve(ctx, connectorId);
        guard(c, 'update_rows');
        const ws = worksheet || c.defaultWorksheet || 'Sheet1';
        const input = rowObject
          ? [rowObject]
          : values
            ? [values]
            : null;
        if (!input) throw new Error('Provide rowObject (preferred) or values');
        const aligned = await alignRowsToSheet(ctx.uid, c.spreadsheetId, ws, input);
        const result = await updateRows(
          ctx.uid,
          c.spreadsheetId,
          ws,
          rowIndex,
          aligned.values[0]!,
        );
        return { ...result, headers: aligned.headers };
      },
    }),
    delete_rows: tool({
      description: 'Delete rows by 1-based inclusive start/end index. Prefer search_rows first.',
      inputSchema: z.object({
        connectorId: z.string(),
        startIndex: z.number(),
        endIndex: z.number(),
        worksheet: z.string().optional(),
      }),
      execute: async ({ connectorId, startIndex, endIndex, worksheet }) => {
        const c = resolve(ctx, connectorId);
        guard(c, 'delete_rows');
        const ws = worksheet || c.defaultWorksheet || 'Sheet1';
        return deleteRows(ctx.uid, c.spreadsheetId, ws, startIndex, endIndex);
      },
    }),
    clear_range: tool({
      description: 'Clear an A1 range (full_crud only)',
      inputSchema: z.object({
        connectorId: z.string(),
        range: z.string(),
      }),
      execute: async ({ connectorId, range }) => {
        const c = resolve(ctx, connectorId);
        guard(c, 'clear_range');
        return clearRange(ctx.uid, c.spreadsheetId, range);
      },
    }),
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
          ctx.setPending({ ...ctx.pending, partialRow: merged, missingFields: missing });
          return { status: 'awaiting_fields', missingFields: missing };
        }
        const ws = c.defaultWorksheet || 'Sheet1';
        if (ctx.pending.intent === 'insert') {
          const aligned = await alignRowsToSheet(ctx.uid, c.spreadsheetId, ws, [
            merged,
          ]);
          const result = await appendRows(ctx.uid, c.spreadsheetId, ws, aligned.values);
          ctx.setPending(null);
          return { status: 'committed', intent: 'insert', result, headers: aligned.headers };
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
          return { status: 'committed', intent: 'update', result, headers: aligned.headers };
        }
        const startIndex = Number(merged._rowIndex);
        if (!startIndex) throw new Error('Delete requires _rowIndex');
        const result = await deleteRows(ctx.uid, c.spreadsheetId, ws, startIndex, startIndex);
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
