import { google } from 'googleapis';
import { decrypt } from '@/lib/crypto';
import { userRef } from '@/lib/firebase/auth';

export async function getGoogleAuth(uid: string) {
  const secretSnap = await userRef(uid).collection('secrets').doc('google').get();
  if (!secretSnap.exists) {
    throw new Error('Google Sheets is not connected. Connect it in Settings → Google Account.');
  }
  const data = secretSnap.data()!;
  const refreshToken = decrypt(data.refreshToken as string);
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  );
  oauth2.setCredentials({ refresh_token: refreshToken });
  return oauth2;
}

export async function getSheetsClient(uid: string) {
  const auth = await getGoogleAuth(uid);
  return google.sheets({ version: 'v4', auth });
}

export async function getSheetValues(
  uid: string,
  spreadsheetId: string,
  range: string,
) {
  const sheets = await getSheetsClient(uid);
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  return res.data.values ?? [];
}

export async function getSpreadsheetMeta(uid: string, spreadsheetId: string) {
  const sheets = await getSheetsClient(uid);
  const res = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'properties.title,sheets.properties',
  });
  return {
    title: res.data.properties?.title ?? 'Untitled',
    sheets: (res.data.sheets ?? []).map((s) => ({
      title: s.properties?.title ?? '',
      sheetId: s.properties?.sheetId ?? 0,
      rowCount: s.properties?.gridProperties?.rowCount ?? 0,
      columnCount: s.properties?.gridProperties?.columnCount ?? 0,
    })),
  };
}
