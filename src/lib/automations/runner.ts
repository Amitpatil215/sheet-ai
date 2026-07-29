import { userRef } from '@/lib/firebase/auth';
import { runAutomationAgent } from '@/lib/ai/agent';
import { nowIso } from '@/lib/utils';
import { computeNextRunAt } from './schedule';
import type { SchedulePreset } from '@/lib/types';

/** Run a single automation and persist an audit chat thread. */
export async function runAutomationOnce(uid: string, automationId: string) {
  const autoRef = userRef(uid).collection('automations').doc(automationId);
  const snap = await autoRef.get();
  if (!snap.exists) throw new Error('Automation not found');
  const auto = snap.data()!;
  const startedAt = nowIso();
  const runRef = await autoRef.collection('runs').add({
    status: 'running',
    startedAt,
  });

  try {
    const now = nowIso();
    const chatData = {
      title: `Auto: ${auto.name} — ${new Date().toLocaleString()}`,
      model: auto.model || null,
      createdAt: now,
      updatedAt: now,
      source: 'automation' as const,
      automationId,
      pendingOperation: null,
      searchablePreview: auto.prompt.slice(0, 200),
    };
    const chatRef = await userRef(uid).collection('chats').add(chatData);
    await chatRef.collection('messages').add({
      role: 'user',
      parts: [{ type: 'text', text: auto.prompt }],
      createdAt: now,
    });

    let pending = null;
    const result = await runAutomationAgent({
      uid,
      messages: [{ role: 'user', content: auto.prompt }],
      connectorIds: auto.connectorIds ?? [],
      model: auto.model,
      pending,
      onPendingChange: (p) => {
        pending = p;
      },
    });

    await chatRef.collection('messages').add({
      role: 'assistant',
      parts: [{ type: 'text', text: result.text }],
      createdAt: nowIso(),
    });
    await chatRef.update({
      pendingOperation: pending,
      updatedAt: nowIso(),
      searchablePreview: result.text.slice(0, 200),
    });

    const finishedAt = nowIso();
    await runRef.update({
      status: 'success',
      chatId: chatRef.id,
      finishedAt,
    });
    await autoRef.update({
      lastRunAt: finishedAt,
      nextRunAt: computeNextRunAt(
        auto.schedule as SchedulePreset,
        auto.timezone || 'UTC',
      ).toISOString(),
      updatedAt: finishedAt,
    });
    return { runId: runRef.id, chatId: chatRef.id, status: 'success' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await runRef.update({
      status: 'failed',
      finishedAt: nowIso(),
      error: message,
    });
    throw err;
  }
}
