import { API_BASE_URL } from './config';

export async function getMessagesForConversation(conversationId) {
  try {
    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`);
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    const text = await response.text();
    if (!text || text.trim() === '') {
      return [];
    }
    return JSON.parse(text);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
}

export async function saveMessage(conversationId, role, content) {
  const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, content }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to save message');
  }

  return response.json();
}

export async function deleteMessagesAfter(conversationId, messageIndex) {
  const response = await fetch(
    `${API_BASE_URL}/conversations/${conversationId}/messages/after/${messageIndex}`,
    { method: 'DELETE', credentials: 'include' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete messages');
  }

  return response.json();
}
