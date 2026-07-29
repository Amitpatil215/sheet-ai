import { NextRequest } from 'next/server';
import { requireUid, userRef, jsonError } from '@/lib/firebase/auth';
import { nowIso, parseSpreadsheetId, slugify } from '@/lib/utils';
import type { Permission } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const uid = await requireUid(req);
    const snap = await userRef(uid)
      .collection('connectors')
      .orderBy('updatedAt', 'desc')
      .get();
    const connectors = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return Response.json({ connectors });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const uid = await requireUid(req);
    const body = await req.json();
    const spreadsheetId =
      body.spreadsheetId || parseSpreadsheetId(body.spreadsheetUrl || '');
    if (!spreadsheetId) {
      return Response.json({ error: 'Invalid spreadsheet URL or ID' }, { status: 400 });
    }
    if (!body.name?.trim()) {
      return Response.json({ error: 'Name is required' }, { status: 400 });
    }
    const now = nowIso();
    const data = {
      name: body.name.trim(),
      slug: body.slug?.trim() || slugify(body.name),
      description: body.description ?? '',
      spreadsheetId,
      spreadsheetUrl: body.spreadsheetUrl ?? '',
      defaultWorksheet: body.defaultWorksheet ?? '',
      systemPrompt: body.systemPrompt ?? '',
      permission: (body.permission as Permission) || 'full_crud',
      enabled: body.enabled !== false,
      createdAt: now,
      updatedAt: now,
    };
    const ref = await userRef(uid).collection('connectors').add(data);
    return Response.json({ id: ref.id, ...data }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
