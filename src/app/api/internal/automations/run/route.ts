import { NextRequest } from 'next/server';
import { runAutomationOnce } from '@/lib/automations/runner';
import { jsonError } from '@/lib/firebase/auth';

/**
 * Internal endpoint invoked by Cloud Functions scheduler.
 * Protected by AUTOMATION_RUNNER_SECRET header.
 */
export async function POST(req: NextRequest) {
  try {
    const secret = process.env.AUTOMATION_RUNNER_SECRET;
    if (!secret || req.headers.get('x-automation-secret') !== secret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { uid, automationId } = await req.json();
    if (!uid || !automationId) {
      return Response.json({ error: 'uid and automationId required' }, { status: 400 });
    }
    const result = await runAutomationOnce(uid, automationId);
    return Response.json(result);
  } catch (err) {
    return jsonError(err);
  }
}
