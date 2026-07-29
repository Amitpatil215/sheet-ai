import { NextRequest } from 'next/server';
import { requireUid, userRef, jsonError } from '@/lib/firebase/auth';
import { nowIso } from '@/lib/utils';

type Ctx = { params: Promise<{ id: string }> };

function templatesCol(uid: string, connectorId: string) {
  return userRef(uid).collection('connectors').doc(connectorId).collection('templates');
}

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const uid = await requireUid(req);
    const { id } = await ctx.params;
    const snap = await templatesCol(uid, id).orderBy('sortOrder').get();
    return Response.json({
      templates: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const uid = await requireUid(req);
    const { id } = await ctx.params;
    const body = await req.json();
    if (!body.title?.trim() || !body.promptBody?.trim()) {
      return Response.json({ error: 'title and promptBody required' }, { status: 400 });
    }
    const data = {
      title: body.title.trim(),
      promptBody: body.promptBody.trim(),
      sortOrder: body.sortOrder ?? Date.now(),
      createdAt: nowIso(),
    };
    const ref = await templatesCol(uid, id).add(data);
    return Response.json({ id: ref.id, ...data }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const uid = await requireUid(req);
    const { id } = await ctx.params;
    const body = await req.json();
    if (!body.templateId) {
      return Response.json({ error: 'templateId required' }, { status: 400 });
    }
    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.promptBody !== undefined) updates.promptBody = body.promptBody;
    if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;
    await templatesCol(uid, id).doc(body.templateId).update(updates);
    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const uid = await requireUid(req);
    const { id } = await ctx.params;
    const templateId = new URL(req.url).searchParams.get('templateId');
    if (!templateId) {
      return Response.json({ error: 'templateId required' }, { status: 400 });
    }
    await templatesCol(uid, id).doc(templateId).delete();
    return new Response(null, { status: 204 });
  } catch (err) {
    return jsonError(err);
  }
}
