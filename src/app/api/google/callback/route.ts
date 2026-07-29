import { NextRequest } from 'next/server';
import { encrypt } from '@/lib/crypto';
import { userRef } from '@/lib/firebase/auth';
import { nowIso } from '@/lib/utils';

/** OAuth callback — exchanges code and stores encrypted refresh token. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (error || !code || !state) {
    return Response.redirect(`${appUrl}/settings?google=error`);
  }

  try {
    const { uid } = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as {
      uid: string;
    };
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET!;
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI!;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokens.refresh_token) {
      return Response.redirect(`${appUrl}/settings?google=no_refresh`);
    }

    let connectedEmail = '';
    if (tokens.access_token) {
      const info = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const profile = await info.json();
      connectedEmail = profile.email ?? '';
    }

    await userRef(uid).collection('secrets').doc('google').set({
      refreshToken: encrypt(tokens.refresh_token),
      scopes: tokens.scope?.split(' ') ?? [],
      connectedEmail,
      updatedAt: nowIso(),
    });

    return Response.redirect(`${appUrl}/settings?google=connected`);
  } catch (e) {
    console.error('[oauth callback]', e);
    return Response.redirect(`${appUrl}/settings?google=error`);
  }
}
