import { NextRequest } from 'next/server';
import { requireUid, jsonError } from '@/lib/firebase/auth';

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

/** Start Google OAuth for Sheets offline access. */
export async function GET(req: NextRequest) {
  try {
    const uid = await requireUid(req);
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      return Response.json(
        { error: 'GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_REDIRECT_URI not configured' },
        { status: 503 },
      );
    }
    const state = Buffer.from(JSON.stringify({ uid, t: Date.now() })).toString('base64url');
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
    return Response.json({
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
    });
  } catch (err) {
    return jsonError(err);
  }
}
