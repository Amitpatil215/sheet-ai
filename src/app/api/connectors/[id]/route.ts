import { NextRequest } from 'next/server';
import { requireUid, userRef, jsonError } from '@/lib/firebase/auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { nowIso, parseSpreadsheetId, slugify } from '@/lib/utils';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const uid = await requireUid(req);
    const { id } = await ctx.params;
    const snap = await userRef(uid).collection('connectors').doc(id).get();
    if (!snap.exists) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json({ id: snap.id, ...snap.data() });
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
    for (const key of [
      'name',
      'slug',
      'description',
      'defaultWorksheet',
      'systemPrompt',
      'permission',
      'enabled',
      'spreadsheetUrl',
    ]) {
      if (body[key] !== undefined) updates[key] = body[key];
    }
    if (body.name && !body.slug) updates.slug = slugify(body.name);
    if (body.spreadsheetUrl || body.spreadsheetId) {
      const sid =
        body.spreadsheetId || parseSpreadsheetId(body.spreadsheetUrl || '');
      if (!sid) return Response.json({ error: 'Invalid spreadsheet' }, { status: 400 });
      updates.spreadsheetId = sid;
    }
    await userRef(uid).collection('connectors').doc(id).update(updates);
    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const uid = await requireUid(req);
    const { id } = await ctx.params;
    const templates = await userRef(uid)
      .collection('connectors')
      .doc(id)
      .collection('templates')
      .get();
    const batch = getAdminDb().batch();
    templates.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(userRef(uid).collection('connectors').doc(id));
    await batch.commit();
    return new Response(null, { status: 204 });
  } catch (err) {
    return jsonError(err);
  }
}
