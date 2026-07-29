import { NextRequest } from 'next/server';
import { getAdminAuth, getAdminDb, isAdminConfigured } from './admin';

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

/** Verify Firebase ID token from Authorization: Bearer header. */
export async function requireUid(req: NextRequest): Promise<string> {
  if (!isAdminConfigured()) {
    throw new AuthError(
      'Firebase Admin is not configured. Set FIREBASE_ADMIN_* env vars.',
      503,
    );
  }
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    throw new AuthError('Missing Authorization bearer token');
  }
  const token = header.slice(7);
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    throw new AuthError('Invalid or expired token');
  }
}

export function userRef(uid: string) {
  return getAdminDb().collection('users').doc(uid);
}

export function jsonError(err: unknown) {
  if (err instanceof AuthError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  const message = err instanceof Error ? err.message : 'Internal server error';
  console.error('[api]', message);
  return Response.json({ error: message }, { status: 500 });
}
