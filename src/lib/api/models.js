import { API_BASE_URL } from './config';
import { retryFetch } from './fetch';

export async function getModels() {
  try {
    const response = await retryFetch(`${API_BASE_URL}/models`);
    if (!response.ok) {
      throw new Error('Failed to fetch models');
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching models:', error);
    return [
      { id: 'deepseek/deepseek-r1-0528:free', name: 'DeepSeek R1 (Free)' },
      { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)' },
      { id: 'meta-llama/llama-4-maverick:free', name: 'Llama 4 Maverick (Free)' },
    ];
  }
}
