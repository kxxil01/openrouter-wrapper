import { Hono } from 'hono';
import { config } from '../lib/config';
import { getCache, setCache } from '../lib/redis';

const OPENROUTER_API_KEY = config.openRouter.apiKey;
const MODEL_CACHE_KEY = 'models';
const MODEL_CACHE_TTL = 60 * 60;

interface ModelData {
  id: string;
  name?: string;
  context_length?: number;
  description?: string;
}

interface ProcessedModel {
  id: string;
  name: string;
  context_length?: number;
  description?: string;
}

const modelRoutes = new Hono();

modelRoutes.get('/', async (c) => {
  try {
    const cached = await getCache<ProcessedModel[]>('openrouter', MODEL_CACHE_KEY);
    if (cached) {
      c.header('X-Cache', 'HIT');
      return c.json(cached);
    }

    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();

    const freeModels = data.data
      .filter((model: ModelData) => model.id.endsWith(':free'))
      .map(
        (model: ModelData): ProcessedModel => ({
          id: model.id,
          name: model.name || model.id.split('/').pop()?.replace(':free', '') || model.id,
          context_length: model.context_length,
          description: model.description,
        })
      )
      .sort((a: ProcessedModel, b: ProcessedModel) => a.name.localeCompare(b.name));

    await setCache('openrouter', MODEL_CACHE_KEY, freeModels, MODEL_CACHE_TTL);
    c.header('X-Cache', 'MISS');
    return c.json(freeModels);
  } catch (error) {
    console.error('Error fetching models:', error);
    return c.json([
      { id: 'deepseek/deepseek-r1-0528:free', name: 'DeepSeek R1 (Free)' },
      { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)' },
      { id: 'meta-llama/llama-4-maverick:free', name: 'Llama 4 Maverick (Free)' },
    ]);
  }
});

export default modelRoutes;
