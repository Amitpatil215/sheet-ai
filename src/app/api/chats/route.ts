import { NextRequest } from 'next/server';
import { requireUid, userRef, jsonError } from '@/lib/firebase/auth';
import { nowIso } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const uid = await requireUid(req);
    const q = new URL(req.url).searchParams.get('q')?.toLowerCase().trim();
    const snap = await userRef(uid)
      .collection('chats')
      .orderBy('updatedAt', 'desc')
      .limit(100)
      .get();
    let chats = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (q) {
      chats = chats.filter((c) => {
        const title = String((c as { title?: string }).title ?? '').toLowerCase();
        const preview = String(
          (c as { searchablePreview?: string }).searchablePreview ?? '',
        ).toLowerCase();
        return title.includes(q) || preview.includes(q);
      });
    }
    return Response.json({ chats });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const uid = await requireUid(req);
    const body = await req.json().catch(() => ({}));
    const now = nowIso();
    const data = {
      title: body.title || 'New chat',
      model: body.model || null,
      createdAt: now,
      updatedAt: now,
      source: body.source || 'user',
      automationId: body.automationId || null,
      pendingOperation: null,
      searchablePreview: '',
    };
    const ref = await userRef(uid).collection('chats').add(data);
    return Response.json({ id: ref.id, ...data }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
