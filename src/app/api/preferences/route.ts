import { NextRequest } from 'next/server';
import { requireUid, userRef, jsonError } from '@/lib/firebase/auth';
import { encrypt } from '@/lib/crypto';
import { DEFAULT_MODEL, nowIso } from '@/lib/utils';
import type { UserPreferences } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const uid = await requireUid(req);
    const snap = await userRef(uid).get();
    const data = snap.data();
    const prefs: UserPreferences = data?.preferences ?? {
      defaultModel: DEFAULT_MODEL,
      theme: 'system',
    };
    const orSnap = await userRef(uid).collection('secrets').doc('openrouter').get();
    const gSnap = await userRef(uid).collection('secrets').doc('google').get();
    return Response.json({
      preferences: prefs,
      openrouter: { configured: orSnap.exists },
      google: {
        connected: gSnap.exists,
        connectedEmail: gSnap.data()?.connectedEmail,
        updatedAt: gSnap.data()?.updatedAt,
      },
      profile: {
        email: data?.email,
        displayName: data?.displayName,
        photoURL: data?.photoURL,
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const uid = await requireUid(req);
    const body = await req.json();
    const updates: Record<string, unknown> = { updatedAt: nowIso() };

    if (body.preferences) {
      updates.preferences = body.preferences;
    }
    if (body.displayName !== undefined) updates.displayName = body.displayName;

    // Ensure user doc exists
    const ref = userRef(uid);
    const snap = await ref.get();
    if (!snap.exists) {
      await ref.set({
        email: body.email ?? '',
        displayName: body.displayName ?? '',
        photoURL: body.photoURL ?? '',
        createdAt: nowIso(),
        preferences: body.preferences ?? {
          defaultModel: DEFAULT_MODEL,
          theme: 'system',
        },
      });
    } else {
      await ref.update(updates);
    }

    if (typeof body.openRouterApiKey === 'string' && body.openRouterApiKey.trim()) {
      await ref.collection('secrets').doc('openrouter').set({
        apiKey: encrypt(body.openRouterApiKey.trim()),
        updatedAt: nowIso(),
      });
    }

    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
