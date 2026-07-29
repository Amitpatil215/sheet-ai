export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  contextLength?: number;
}

interface OpenRouterModelsResponse {
  data?: {
    id: string;
    name: string;
    description?: string;
    context_length?: number;
  }[];
}

/** Load chat models from OpenRouter (optionally authenticated). */
export async function fetchOpenRouterModels(
  apiKey?: string,
): Promise<OpenRouterModel[]> {
  const headers: Record<string, string> = {};
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers,
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      text || `OpenRouter models request failed (${res.status})`,
    );
  }

  const json = (await res.json()) as OpenRouterModelsResponse;
  const rows = json.data ?? [];
  return rows
    .map((m) => ({
      id: m.id,
      name: m.name || m.id,
      description: m.description,
      contextLength: m.context_length,
    }))
    .filter((m) => m.id)
    .sort((a, b) => a.name.localeCompare(b.name));
}
