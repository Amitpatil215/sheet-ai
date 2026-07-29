import { NextRequest } from 'next/server';
import {
  convertToModelMessages,
  type UIMessage,
} from 'ai';
import { requireUid, userRef, jsonError } from '@/lib/firebase/auth';
import { runChatAgent } from '@/lib/ai/agent';
import { nowIso, DEFAULT_MODEL } from '@/lib/utils';
import type { PendingOperation } from '@/lib/types';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const uid = await requireUid(req);
    const body = await req.json();
    const {
      messages,
      chatId,
      connectorIds = [],
      model,
    }: {
      messages: UIMessage[];
      chatId: string;
      connectorIds?: string[];
      model?: string;
    } = body;

    if (!chatId) {
      return Response.json({ error: 'chatId required' }, { status: 400 });
    }

    const chatRef = userRef(uid).collection('chats').doc(chatId);
    const chatSnap = await chatRef.get();
    if (!chatSnap.exists) {
      return Response.json({ error: 'Chat not found' }, { status: 404 });
    }

    const chatData = chatSnap.data()!;
    let pending = (chatData.pendingOperation as PendingOperation | null) ?? null;

    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUser) {
      const text = extractText(lastUser);
      await chatRef.collection('messages').add({
        role: 'user',
        parts: [{ type: 'text', text }],
        createdAt: nowIso(),
      });
      const title =
        chatData.title === 'New chat' && text
          ? text.slice(0, 60)
          : chatData.title;
      await chatRef.update({
        title,
        updatedAt: nowIso(),
        searchablePreview: text.slice(0, 200),
      });
    }

    const prefs = (await userRef(uid).get()).data()?.preferences;
    const modelId = model || chatData.model || prefs?.defaultModel || DEFAULT_MODEL;
    const coreMessages = await convertToModelMessages(messages);

    const result = await runChatAgent({
      uid,
      messages: coreMessages,
      connectorIds,
      model: modelId,
      pending,
      onPendingChange: (p) => {
        pending = p;
      },
    });

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      onFinish: async ({ responseMessage }) => {
        await chatRef.collection('messages').add({
          role: 'assistant',
          parts: responseMessage.parts ?? [],
          createdAt: nowIso(),
        });
        await chatRef.update({
          pendingOperation: pending,
          updatedAt: nowIso(),
        });
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}

function extractText(message: UIMessage): string {
  if (!message.parts) return '';
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('\n');
}
