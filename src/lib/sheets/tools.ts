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
  rowObjectToValues,
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
      description: 'Get headers, sample rows, and sheet names for a connector',
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
      description: 'Read rows from a worksheet',
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
      description: 'Search rows by text query',
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
      description: 'Append one or more rows (array of value arrays matching headers)',
      inputSchema: z.object({
        connectorId: z.string(),
        worksheet: z.string().optional(),
        rows: z.array(z.array(z.string())),
      }),
      execute: async ({ connectorId, worksheet, rows }) => {
        const c = resolve(ctx, connectorId);
        guard(c, 'append_rows');
        const ws = worksheet || c.defaultWorksheet || 'Sheet1';
        return appendRows(ctx.uid, c.spreadsheetId, ws, rows);
      },
    }),
    update_rows: tool({
      description: 'Update a row by 1-based row index',
      inputSchema: z.object({
        connectorId: z.string(),
        rowIndex: z.number(),
        values: z.array(z.string()),
        worksheet: z.string().optional(),
      }),
      execute: async ({ connectorId, rowIndex, values, worksheet }) => {
        const c = resolve(ctx, connectorId);
        guard(c, 'update_rows');
        const ws = worksheet || c.defaultWorksheet || 'Sheet1';
        return updateRows(ctx.uid, c.spreadsheetId, ws, rowIndex, values);
      },
    }),
    delete_rows: tool({
      description: 'Delete rows by 1-based inclusive start/end index',
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
        'Propose an incomplete insert/update/delete; stores pending state and lists missing fields',
      inputSchema: z.object({
        connectorId: z.string(),
        intent: z.enum(['insert', 'update', 'delete']),
        partialRow: z.record(z.string(), z.unknown()),
        requiredFields: z.array(z.string()),
      }),
      execute: async ({ connectorId, intent, partialRow, requiredFields }) => {
        const c = resolve(ctx, connectorId);
        guard(c, 'propose_operation');
        const missing = requiredFields.filter(
          (f) => partialRow[f] === undefined || partialRow[f] === '' || partialRow[f] === null,
        );
        const pending: PendingOperation = {
          connectorId,
          intent,
          partialRow,
          requiredFields,
          missingFields: missing,
          createdAt: nowIso(),
        };
        ctx.setPending(pending);
        return {
          status: missing.length ? 'awaiting_fields' : 'ready',
          missingFields: missing,
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
          const headers = await headersFor(ctx.uid, c.spreadsheetId, ws);
          const values = rowObjectToValues(headers, merged);
          const result = await appendRows(ctx.uid, c.spreadsheetId, ws, [values]);
          ctx.setPending(null);
          return { status: 'committed', intent: 'insert', result };
        }
        if (ctx.pending.intent === 'update') {
          const rowIndex = Number(merged._rowIndex);
          if (!rowIndex) throw new Error('Update requires _rowIndex in partialRow');
          const headers = await headersFor(ctx.uid, c.spreadsheetId, ws);
          const values = rowObjectToValues(headers, merged);
          const result = await updateRows(ctx.uid, c.spreadsheetId, ws, rowIndex, values);
          ctx.setPending(null);
          return { status: 'committed', intent: 'update', result };
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
