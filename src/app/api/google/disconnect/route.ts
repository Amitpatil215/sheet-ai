import { NextRequest } from 'next/server';
import { requireUid, userRef, jsonError } from '@/lib/firebase/auth';

export async function POST(req: NextRequest) {
  try {
    const uid = await requireUid(req);
    await userRef(uid).collection('secrets').doc('google').delete();
    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
