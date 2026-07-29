import { NextRequest } from 'next/server';
import { requireUid, userRef, jsonError } from '@/lib/firebase/auth';
import { nowIso } from '@/lib/utils';
import { computeNextRunAt } from '@/lib/automations/schedule';
import type { SchedulePreset } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const uid = await requireUid(req);
    const snap = await userRef(uid)
      .collection('automations')
      .orderBy('updatedAt', 'desc')
      .get();
    return Response.json({
      automations: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const uid = await requireUid(req);
    const body = await req.json();
    if (!body.name?.trim() || !body.prompt?.trim()) {
      return Response.json({ error: 'name and prompt required' }, { status: 400 });
    }
    const schedule = (body.schedule as SchedulePreset) || 'daily';
    const timezone = body.timezone || 'UTC';
    const now = nowIso();
    const data = {
      name: body.name.trim(),
      prompt: body.prompt.trim(),
      connectorIds: body.connectorIds ?? [],
      schedule,
      cron: body.cron ?? null,
      timezone,
      enabled: body.enabled !== false,
      model: body.model ?? null,
      lastRunAt: null,
      nextRunAt: computeNextRunAt(schedule, timezone).toISOString(),
      createdAt: now,
      updatedAt: now,
    };
    const ref = await userRef(uid).collection('automations').add(data);
    return Response.json({ id: ref.id, ...data }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
