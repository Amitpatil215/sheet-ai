import { getSheetsClient, getSheetValues } from './client';
import { detectHeaderRowIndex } from './header-detect';

export async function appendRows(
  uid: string,
  spreadsheetId: string,
  worksheet: string,
  values: string[][],
) {
  const sheets = await getSheetsClient(uid);
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${worksheet}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
  return { updatedRange: res.data.updates?.updatedRange, rows: values.length };
}

export async function updateRows(
  uid: string,
  spreadsheetId: string,
  worksheet: string,
  rowIndex: number,
  values: string[],
) {
  const sheets = await getSheetsClient(uid);
  const range = `${worksheet}!A${rowIndex}:Z${rowIndex}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  });
  return { rowIndex, updated: true };
}

export async function deleteRows(
  uid: string,
  spreadsheetId: string,
  worksheet: string,
  startIndex: number,
  endIndex: number,
) {
  const sheets = await getSheetsClient(uid);
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties',
  });
  const sheet = meta.data.sheets?.find((s) => s.properties?.title === worksheet);
  const sheetId = sheet?.properties?.sheetId;
  if (sheetId == null) throw new Error(`Worksheet "${worksheet}" not found`);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: startIndex - 1,
              endIndex,
            },
          },
        },
      ],
    },
  });
  return { deleted: endIndex - startIndex + 1 };
}

export async function clearRange(
  uid: string,
  spreadsheetId: string,
  range: string,
) {
  const sheets = await getSheetsClient(uid);
  await sheets.spreadsheets.values.clear({ spreadsheetId, range });
  return { cleared: range };
}

/** Resolve headers by scanning the first 4 rows for the best header candidate. */
export async function headersFor(
  uid: string,
  spreadsheetId: string,
  worksheet: string,
): Promise<{ headers: string[]; headerRow: number }> {
  const rows = await getSheetValues(uid, spreadsheetId, `${worksheet}!A1:Z4`);
  const detected = detectHeaderRowIndex(rows, 4);
  return { headers: detected.headers, headerRow: detected.headerRow };
}

export function rowObjectToValues(
  headers: string[],
  row: Record<string, unknown>,
): string[] {
  return headers.map((h) => {
    if (h && row[h] !== undefined && row[h] !== null) return String(row[h]);
    const key = Object.keys(row).find(
      (k) => k.toLowerCase() === h.toLowerCase(),
    );
    return key != null ? String(row[key] ?? '') : '';
  });
}

/** Align incoming rows to existing headers; reject unknown columns / empty sheets. */
export async function alignRowsToSheet(
  uid: string,
  spreadsheetId: string,
  worksheet: string,
  rows: Record<string, unknown>[] | string[][],
): Promise<{ headers: string[]; values: string[][]; headerRow: number }> {
  const { headers, headerRow } = await headersFor(uid, spreadsheetId, worksheet);
  if (!headers.length || headers.every((h) => !h.trim())) {
    throw new Error(
      'Sheet has no headers. Ask the user how to structure columns before writing.',
    );
  }
  if (!rows.length) throw new Error('No rows to write');

  if (Array.isArray(rows[0])) {
    const arrays = rows as string[][];
    for (const r of arrays) {
      if (r.length > headers.length) {
        throw new Error(
          `Row has ${r.length} cells but sheet has ${headers.length} headers: ${headers.join(', ')}`,
        );
      }
    }
    return {
      headers,
      headerRow,
      values: arrays.map((r) => {
        const padded = [...r.map(String)];
        while (padded.length < headers.length) padded.push('');
        return padded.slice(0, headers.length);
      }),
    };
  }

  const objects = rows as Record<string, unknown>[];
  const headerSet = new Set(headers.map((h) => h.toLowerCase()));
  for (const obj of objects) {
    const unknown = Object.keys(obj).filter(
      (k) => !k.startsWith('_') && !headerSet.has(k.toLowerCase()),
    );
    if (unknown.length) {
      throw new Error(
        `Unknown columns [${unknown.join(', ')}]. Use only: ${headers.join(', ')}`,
      );
    }
  }
  return {
    headers,
    headerRow,
    values: objects.map((obj) => rowObjectToValues(headers, obj)),
  };
}
