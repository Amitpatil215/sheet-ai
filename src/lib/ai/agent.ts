import { streamText, generateText, stepCountIs, type ModelMessage } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { userRef } from '@/lib/firebase/auth';
import type { Connector, UserPreferences } from '@/lib/types';
import { createSheetsTools, type ToolContext } from '@/lib/sheets/tools';
import { buildSystemPrompt } from './system-prompt';
import { DEFAULT_MODEL } from '@/lib/utils';
import { getOpenRouterKey } from '@/lib/openrouter/key';

export async function loadConnectors(
  uid: string,
  ids: string[],
): Promise<Connector[]> {
  if (!ids.length) return [];
  const col = userRef(uid).collection('connectors');
  const results: Connector[] = [];
  for (const id of ids) {
    const snap = await col.doc(id).get();
    if (snap.exists) results.push({ id: snap.id, ...snap.data() } as Connector);
  }
  return results;
}

/** Load all enabled connectors for auto-selection when none are explicitly tagged. */
export async function loadAllConnectors(uid: string): Promise<Connector[]> {
  const col = userRef(uid).collection('connectors');
  const snap = await col.where('enabled', '==', true).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Connector);
}

async function loadUserContext(uid: string) {
  const data = (await userRef(uid).get()).data();
  const prefs = (data?.preferences ?? {}) as UserPreferences;
  return {
    displayName: typeof data?.displayName === 'string' ? data.displayName : undefined,
    personalInfo: prefs.personalInfo,
  };
}

export interface AgentInput {
  uid: string;
  messages: ModelMessage[];
  connectorIds: string[];
  model?: string;
}

export async function runChatAgent(input: AgentInput) {
  const apiKey = await getOpenRouterKey(input.uid);
  const openrouter = createOpenRouter({ apiKey });
  const connectors = input.connectorIds.length
    ? await loadConnectors(input.uid, input.connectorIds)
    : await loadAllConnectors(input.uid);
  const map = new Map(connectors.map((c) => [c.id, c]));
  const userCtx = await loadUserContext(input.uid);

  const ctx: ToolContext = {
    uid: input.uid,
    connectors: map,
  };

  const tools = createSheetsTools(ctx);
  const modelId = input.model || DEFAULT_MODEL;

  return streamText({
    model: openrouter(modelId),
    system: buildSystemPrompt({
      connectors: [...map.values()],
      ...userCtx,
    }),
    messages: input.messages,
    tools,
    stopWhen: stepCountIs(8),
  });
}

/** Non-streaming agent for automation runs. */
export async function runAutomationAgent(input: AgentInput) {
  const apiKey = await getOpenRouterKey(input.uid);
  const openrouter = createOpenRouter({ apiKey });
  const connectors = await loadConnectors(input.uid, input.connectorIds);
  const map = new Map(connectors.map((c) => [c.id, c]));
  const userCtx = await loadUserContext(input.uid);
  const ctx: ToolContext = {
    uid: input.uid,
    connectors: map,
  };
  const result = await generateText({
    model: openrouter(input.model || DEFAULT_MODEL),
    system: buildSystemPrompt({
      connectors: [...map.values()],
      ...userCtx,
    }),
    messages: input.messages,
    tools: createSheetsTools(ctx),
    stopWhen: stepCountIs(8),
  });
  return result;
}
