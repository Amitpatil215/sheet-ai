import { NextRequest } from 'next/server';
import { requireUid, userRef, jsonError } from '@/lib/firebase/auth';
import { nowIso } from '@/lib/utils';
import { computeNextRunAt } from '@/lib/automations/schedule';
import type { SchedulePreset } from '@/lib/types';
import { runAutomationOnce } from '@/lib/automations/runner';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const uid = await requireUid(req);
    const { id } = await ctx.params;
    const snap = await userRef(uid).collection('automations').doc(id).get();
    if (!snap.exists) return Response.json({ error: 'Not found' }, { status: 404 });
    const runs = await userRef(uid)
      .collection('automations')
      .doc(id)
      .collection('runs')
      .orderBy('startedAt', 'desc')
      .limit(20)
      .get();
    return Response.json({
      automation: { id: snap.id, ...snap.data() },
      runs: runs.docs.map((d) => ({ id: d.id, ...d.data() })),
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
    for (const key of [
      'name',
      'prompt',
      'connectorIds',
      'schedule',
      'cron',
      'timezone',
      'enabled',
      'model',
    ]) {
      if (body[key] !== undefined) updates[key] = body[key];
    }
    if (body.schedule || body.timezone) {
      const existing = (
        await userRef(uid).collection('automations').doc(id).get()
      ).data();
      const schedule = (body.schedule || existing?.schedule) as SchedulePreset;
      const timezone = body.timezone || existing?.timezone || 'UTC';
      updates.nextRunAt = computeNextRunAt(schedule, timezone).toISOString();
    }
    if (body.runNow) {
      const result = await runAutomationOnce(uid, id);
      return Response.json({ ok: true, run: result });
    }
    await userRef(uid).collection('automations').doc(id).update(updates);
    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const uid = await requireUid(req);
    const { id } = await ctx.params;
    await userRef(uid).collection('automations').doc(id).delete();
    return new Response(null, { status: 204 });
  } catch (err) {
    return jsonError(err);
  }
}
