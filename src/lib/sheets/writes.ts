import { getSheetsClient, getSheetValues } from './client';

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

export async function headersFor(
  uid: string,
  spreadsheetId: string,
  worksheet: string,
): Promise<string[]> {
  const rows = await getSheetValues(uid, spreadsheetId, `${worksheet}!A1:Z1`);
  return (rows[0] ?? []).map(String);
}

export function rowObjectToValues(
  headers: string[],
  row: Record<string, unknown>,
): string[] {
  return headers.map((h) => String(row[h] ?? ''));
}
