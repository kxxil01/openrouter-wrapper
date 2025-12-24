import { API_BASE_URL } from './config';

export async function searchConversations(query) {
  if (!query || query.trim().length === 0) {
    return { conversations: [], messages: [] };
  }

  const response = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Search failed');
  }

  return response.json();
}
