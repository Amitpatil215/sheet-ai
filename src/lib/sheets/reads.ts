import { getSheetValues, getSpreadsheetMeta } from './client';

export async function getSheetSchema(
  uid: string,
  spreadsheetId: string,
  worksheet?: string,
) {
  const meta = await getSpreadsheetMeta(uid, spreadsheetId);
  const sheetName = worksheet || meta.sheets[0]?.title || 'Sheet1';
  const rows = await getSheetValues(uid, spreadsheetId, `${sheetName}!A1:Z20`);
  const headers = (rows[0] ?? []).map(String);
  const sampleRows = rows.slice(1, 6).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h || `col_${i}`] = String(r[i] ?? '');
    });
    return obj;
  });
  return {
    title: meta.title,
    worksheet: sheetName,
    headers,
    sampleRows,
    dimensions: { rows: rows.length, columns: headers.length },
    sheets: meta.sheets.map((s) => s.title),
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

export async function searchRows(
  uid: string,
  spreadsheetId: string,
  worksheet: string,
  query: string,
  column?: string,
) {
  const rows = await getSheetValues(uid, spreadsheetId, `${worksheet}!A:Z`);
  if (!rows.length) return { matches: [] };
  const headers = rows[0]!.map(String);
  const colIdx = column ? headers.findIndex((h) => h === column) : -1;
  const q = query.toLowerCase();
  const matches: { rowIndex: number; row: Record<string, string> }[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]!;
    const hay =
      colIdx >= 0
        ? String(row[colIdx] ?? '')
        : row.map(String).join(' ');
    if (hay.toLowerCase().includes(q)) {
      const obj: Record<string, string> = {};
      headers.forEach((h, j) => {
        obj[h || `col_${j}`] = String(row[j] ?? '');
      });
      matches.push({ rowIndex: i + 1, row: obj });
    }
  }
  return { matches: matches.slice(0, 50) };
}
