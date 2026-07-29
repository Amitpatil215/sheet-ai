import { NextRequest } from 'next/server';
import { requireUid, jsonError } from '@/lib/firebase/auth';
import { fetchOpenRouterModels } from '@/lib/openrouter/fetch-models';
import { getOpenRouterKeyOptional } from '@/lib/openrouter/key';
import { FALLBACK_MODELS } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const uid = await requireUid(req);
    const apiKey = await getOpenRouterKeyOptional(uid);
    try {
      const models = await fetchOpenRouterModels(apiKey);
      return Response.json({ models, source: 'openrouter' });
    } catch (firstErr) {
      if (apiKey) throw firstErr;
      try {
        const models = await fetchOpenRouterModels();
        return Response.json({ models, source: 'openrouter' });
      } catch {
        return Response.json({
          error:
            'Could not load models from OpenRouter. Add your API key in Settings.',
          models: FALLBACK_MODELS.map((m) => ({
            id: m.id,
            name: m.label,
          })),
          source: 'fallback',
        });
      }
    }
  } catch (err) {
    return jsonError(err);
  }
}
