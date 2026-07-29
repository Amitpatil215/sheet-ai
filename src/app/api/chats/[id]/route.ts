import { NextRequest } from 'next/server';
import { requireUid, userRef, jsonError } from '@/lib/firebase/auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { nowIso } from '@/lib/utils';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const uid = await requireUid(req);
    const { id } = await ctx.params;
    const chatSnap = await userRef(uid).collection('chats').doc(id).get();
    if (!chatSnap.exists) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }
    const msgSnap = await userRef(uid)
      .collection('chats')
      .doc(id)
      .collection('messages')
      .orderBy('createdAt', 'asc')
      .get();
    return Response.json({
      chat: { id: chatSnap.id, ...chatSnap.data() },
      messages: msgSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    });
  } catch (err) {
    return jsonError(err);
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const uid = await requireUid(req);
    const { id } = await ctx.params;
    const body = await req.json();
    const updates: Record<string, unknown> = { updatedAt: nowIso() };
    if (body.title !== undefined) updates.title = body.title;
    if (body.model !== undefined) updates.model = body.model;
    if (body.pendingOperation !== undefined) {
      updates.pendingOperation = body.pendingOperation;
    }
    await userRef(uid).collection('chats').doc(id).update(updates);
    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const uid = await requireUid(req);
    const { id } = await ctx.params;
    const msgs = await userRef(uid)
      .collection('chats')
      .doc(id)
      .collection('messages')
      .get();
    const batch = getAdminDb().batch();
    msgs.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(userRef(uid).collection('chats').doc(id));
    await batch.commit();
    return new Response(null, { status: 204 });
  } catch (err) {
    return jsonError(err);
  }
}
