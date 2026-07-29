import { NextRequest } from 'next/server';
import { runAutomationOnce } from '@/lib/automations/runner';
import { jsonError } from '@/lib/firebase/auth';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * GET  — Cron endpoint. Call from cron-job.org (or any scheduler).
 *        Finds all due automations and runs them.
 *        Protected by AUTOMATION_RUNNER_SECRET via query param or header.
 *
 * POST — Run a single automation (legacy / manual trigger).
 */

function checkSecret(req: NextRequest): boolean {
  const secret = process.env.AUTOMATION_RUNNER_SECRET;
  if (!secret) return false;
  const fromHeader = req.headers.get('x-automation-secret');
  const fromQuery = req.nextUrl.searchParams.get('secret');
  return fromHeader === secret || fromQuery === secret;
}

/** GET /api/internal/automations/run?secret=XXX */
export async function GET(req: NextRequest) {
  try {
    if (!checkSecret(req)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getFirestore();
    const now = new Date().toISOString();
    const snap = await db
      .collectionGroup('automations')
      .where('enabled', '==', true)
      .where('nextRunAt', '<=', now)
      .limit(20)
      .get();

    const results: { uid: string; automationId: string; status: string }[] = [];

    for (const doc of snap.docs) {
      const uid = doc.ref.parent.parent?.id;
      if (!uid) continue;
      try {
        await runAutomationOnce(uid, doc.id);
        results.push({ uid, automationId: doc.id, status: 'success' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        results.push({ uid, automationId: doc.id, status: `failed: ${msg}` });
      }
    }

    return Response.json({ processed: results.length, results });
  } catch (err) {
    return jsonError(err);
  }
}

/** POST /api/internal/automations/run — run a single automation */
export async function POST(req: NextRequest) {
  try {
    if (!checkSecret(req)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { uid, automationId } = await req.json();
    if (!uid || !automationId) {
      return Response.json(
        { error: 'uid and automationId required' },
        { status: 400 },
      );
    }
    const result = await runAutomationOnce(uid, automationId);
    return Response.json(result);
  } catch (err) {
    return jsonError(err);
  }
}
