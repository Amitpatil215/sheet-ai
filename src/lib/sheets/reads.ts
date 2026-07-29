import { getSheetValues, getSpreadsheetMeta } from './client';
import { detectHeaderRowIndex } from './header-detect';

function inferFormatHint(values: string[]): string {
  const nonEmpty = values.map((v) => v.trim()).filter(Boolean);
  if (!nonEmpty.length) return 'empty-ok';
  if (nonEmpty.every((v) => /^[\d,.₹$€£¥]+$/.test(v) || /^-?\d+(\.\d+)?$/.test(v))) {
    return 'number-or-currency';
  }
  if (nonEmpty.every((v) => /^\d{4}-\d{2}-\d{2}/.test(v) || /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(v))) {
    return 'date-like';
  }
  if (nonEmpty.every((v) => /^(true|false|yes|no)$/i.test(v))) {
    return 'boolean-like';
  }
  return 'text';
}

/** Headers, sample rows, and per-column format hints for the agent. */
export async function getSheetSchema(
  uid: string,
  spreadsheetId: string,
  worksheet?: string,
) {
  const meta = await getSpreadsheetMeta(uid, spreadsheetId);
  const sheetName = worksheet || meta.sheets[0]?.title || 'Sheet1';
  const rows = await getSheetValues(uid, spreadsheetId, `${sheetName}!A1:Z20`);
  const detected = detectHeaderRowIndex(rows, 4);
  const headerIdx = detected.headerRow - 1;
  const headers = detected.headers;
  const dataRows = rows.slice(headerIdx + 1, headerIdx + 6);
  const sampleRows = dataRows.map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h || `col_${i}`] = String(r[i] ?? '');
    });
    return obj;
  });
  const columnFormats = headers.map((h, i) => ({
    header: h || `col_${i}`,
    formatHint: inferFormatHint(dataRows.map((r) => String(r[i] ?? ''))),
    sampleValues: dataRows
      .map((r) => String(r[i] ?? ''))
      .filter((v) => v.trim())
      .slice(0, 3),
  }));
  return {
    title: meta.title,
    worksheet: sheetName,
    headerRow: detected.headerRow,
    headerConfidence: detected.confidence,
    headers,
    sampleRows,
    columnFormats,
    previewRows: rows.slice(0, 4).map((r, i) => ({
      row: i + 1,
      cells: r.map(String),
      chosenAsHeader: i + 1 === detected.headerRow,
    })),
    guidance:
      `Headers detected on row ${detected.headerRow} (${detected.confidence} confidence). ` +
      'Append/update using these exact header names and matching value styles from sampleRows.',
    dimensions: { rows: rows.length, columns: headers.length },
    sheets: meta.sheets.map((s) => s.title),
    isEmpty: headers.every((h) => !h.trim()) && dataRows.length === 0,
  };
}

export async function readRows(
  uid: string,
  spreadsheetId: string,
  worksheet: string,
  startRow = 1,
  limit = 50,
) {
  const end = startRow + limit - 1;
  const rows = await getSheetValues(
    uid,
    spreadsheetId,
    `${worksheet}!A${startRow}:Z${end}`,
  );
  return { worksheet, startRow, rows };
}

function rowToObject(
  row: string[],
  headers: string[],
): Record<string, string> {
  const obj: Record<string, string> = {};
  headers.forEach((h, j) => {
    obj[h || `col_${j}`] = String(row[j] ?? '');
  });
  return obj;
}

function windowAround(
  rows: string[][],
  headers: string[],
  matchIdx: number,
  before: number,
  after: number,
) {
  const start = Math.max(0, matchIdx - before);
  const end = Math.min(rows.length - 1, matchIdx + after);
  const around: { rowIndex: number; isMatch: boolean; row: Record<string, string> }[] =
    [];
  for (let i = start; i <= end; i++) {
    around.push({
      rowIndex: i + 1,
      isMatch: i === matchIdx,
      row: rowToObject(rows[i]!, headers),
    });
  }
  return { startRow: start + 1, endRow: end + 1, around };
}

export async function searchRows(
  uid: string,
  spreadsheetId: string,
  worksheet: string,
  query: string,
  column?: string,
  contextBefore = 5,
  contextAfter = 15,
) {
  const rows = await getSheetValues(uid, spreadsheetId, `${worksheet}!A:Z`);
  if (!rows.length) return { matches: [], guidance: 'Sheet is empty.' };
  const detected = detectHeaderRowIndex(rows, 4);
  const headerIdx = detected.headerRow - 1;
  const headers = detected.headers;
  const colIdx = column ? headers.findIndex((h) => h === column) : -1;
  const q = query.toLowerCase();
  const matches: {
    rowIndex: number;
    row: Record<string, string>;
    startRow: number;
    endRow: number;
    around: { rowIndex: number; isMatch: boolean; row: Record<string, string> }[];
  }[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i]!;
    const hay =
      colIdx >= 0
        ? String(row[colIdx] ?? '')
        : row.map(String).join(' ');
    if (hay.toLowerCase().includes(q)) {
      const win = windowAround(rows, headers, i, contextBefore, contextAfter);
      matches.push({
        rowIndex: i + 1,
        row: rowToObject(row, headers),
        ...win,
      });
    }
  }
  return {
    matches: matches.slice(0, 50),
    headerRow: detected.headerRow,
    contextBefore,
    contextAfter,
    guidance:
      matches.length === 0
        ? 'No exact hits. Retry with a shorter/partial query (unique substring) before concluding nothing exists.'
        : 'Matched rows may be section labels only. Related items are often in `around` rows above/below until the next label. Prefer that window over saying not found.',
  };
}
