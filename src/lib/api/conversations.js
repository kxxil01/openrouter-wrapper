import { API_BASE_URL } from './config';
import { retryFetch } from './fetch';

export async function getConversations() {
  try {
    const response = await retryFetch(`${API_BASE_URL}/conversations`);
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    const text = await response.text();
    if (!text || text.trim() === '') {
      return [];
    }
    return JSON.parse(text);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return [];
  }
}

export async function createConversation(title, modelId) {
  const response = await fetch(`${API_BASE_URL}/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, model_id: modelId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create conversation');
  }

  return response.json();
}

export async function updateConversation(id, updates) {
  const response = await fetch(`${API_BASE_URL}/conversations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update conversation');
  }

  return response.json();
}

export async function deleteConversation(conversationId) {
  if (!conversationId) {
    throw new Error('Conversation ID is required');
  }

  const response = await retryFetch(`${API_BASE_URL}/conversations/${conversationId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: { message: `HTTP error ${response.status}` } }));
    throw new Error(errorData.error?.message || `Failed to delete conversation`);
  }

  return response.json();
}

export async function generateConversationTitle(conversationId) {
  const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/generate-title`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to generate title');
  }

  return response.json();
}

export async function exportConversation(conversationId, format = 'json') {
  const response = await fetch(
    `${API_BASE_URL}/conversations/${conversationId}/export?format=${format}`,
    { credentials: 'include' }
  );

  if (!response.ok) {
    throw new Error('Failed to export conversation');
  }

  const blob = await response.blob();
  const filename =
    response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ||
    `conversation.${format === 'markdown' ? 'md' : 'json'}`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
