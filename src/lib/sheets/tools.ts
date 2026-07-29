import { tool } from 'ai';
import { z } from 'zod';
import { getSheetSchema, readRows, searchRows } from './reads';
import {
  appendRows,
  updateRows,
  deleteRows,
  clearRange,
  alignRowsToSheet,
} from './writes';
import { resolve, guard, type ToolContext } from './tool-helpers';
import { createPendingTools } from './pending-tools';

export type { ToolContext };

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
        return getSheetSchema(
          ctx.uid,
          c.spreadsheetId,
          worksheet || c.defaultWorksheet,
        );
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
      description:
        'Search rows by text. Returns each hit plus neighboring `around` rows (labels often sit alone; related data is nearby). If 0 hits, retry a shorter substring before concluding empty.',
      inputSchema: z.object({
        connectorId: z.string(),
        query: z.string(),
        worksheet: z.string().optional(),
        column: z.string().optional(),
        contextBefore: z
          .number()
          .optional()
          .describe('Rows above each match to include (default 5)'),
        contextAfter: z
          .number()
          .optional()
          .describe('Rows below each match to include (default 15)'),
      }),
      execute: async ({
        connectorId,
        query,
        worksheet,
        column,
        contextBefore,
        contextAfter,
      }) => {
        const c = resolve(ctx, connectorId);
        guard(c, 'search_rows');
        const ws = worksheet || c.defaultWorksheet || 'Sheet1';
        return searchRows(
          ctx.uid,
          c.spreadsheetId,
          ws,
          query,
          column,
          contextBefore,
          contextAfter,
        );
      },
    }),
    append_rows: tool({
      description:
        'Append rows matching existing headers. Prefer rowObjects keyed by exact header names. Call get_sheet_schema first.',
      inputSchema: z.object({
        connectorId: z.string(),
        worksheet: z.string().optional(),
        rowObjects: z
          .array(
            z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
          )
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
        const aligned = await alignRowsToSheet(
          ctx.uid,
          c.spreadsheetId,
          ws,
          input,
        );
        const result = await appendRows(
          ctx.uid,
          c.spreadsheetId,
          ws,
          aligned.values,
        );
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
        const aligned = await alignRowsToSheet(
          ctx.uid,
          c.spreadsheetId,
          ws,
          input,
        );
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
      description:
        'Delete rows by 1-based inclusive start/end index. Prefer search_rows first.',
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
    ...createPendingTools(ctx),
  };
}
