import { API_BASE_URL } from './config';

export async function shareConversation(conversationId) {
  const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/share`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to share conversation');
  }

  return response.json();
}

export async function unshareConversation(conversationId) {
  const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/share`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to unshare conversation');
  }

  return response.json();
}

export async function getSharedConversation(shareId) {
  const response = await fetch(`${API_BASE_URL}/shared/${shareId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch shared conversation');
  }

  return response.json();
}
