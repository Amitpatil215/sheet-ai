import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

initializeApp();
const db = getFirestore();

/**
 * Scans due automations every 5 minutes and invokes the Next.js run endpoint
 * (or runs inline if AUTOMATION_RUNNER_URL is unset — marks due jobs for the app).
 *
 * Set AUTOMATION_RUNNER_URL to https://your-app/api/internal/automations/run
 * and AUTOMATION_RUNNER_SECRET for authenticated invocation.
 */
export const processDueAutomations = onSchedule(
  {
    schedule: 'every 5 minutes',
    timeoutSeconds: 300,
    memory: '512MiB',
  },
  async () => {
    const now = new Date().toISOString();
    const snap = await db
      .collectionGroup('automations')
      .where('enabled', '==', true)
      .where('nextRunAt', '<=', now)
      .limit(20)
      .get();

    logger.info(`Found ${snap.size} due automation(s)`);

    const runnerUrl = process.env.AUTOMATION_RUNNER_URL;
    const secret = process.env.AUTOMATION_RUNNER_SECRET;

    for (const doc of snap.docs) {
      const userId = doc.ref.parent.parent?.id;
      if (!userId) continue;

      if (runnerUrl && secret) {
        try {
          const res = await fetch(runnerUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-automation-secret': secret,
            },
            body: JSON.stringify({ uid: userId, automationId: doc.id }),
          });
          if (!res.ok) {
            logger.error('Runner failed', {
              status: res.status,
              body: await res.text(),
            });
          }
        } catch (err) {
          logger.error('Runner invoke error', err);
        }
      } else {
        // Without a runner URL, bump nextRunAt to avoid tight loops and log.
        logger.warn(
          'AUTOMATION_RUNNER_URL not set; deferring automation',
          doc.ref.path,
        );
        const next = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        await doc.ref.update({
          nextRunAt: next,
          updatedAt: Timestamp.now().toDate().toISOString(),
        });
      }
    }
  },
);
