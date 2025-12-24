import { API_BASE_URL } from './config';

export async function getCurrentUser() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      credentials: 'include',
    });
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
}

export function getLoginUrl() {
  return '/auth/login';
}

export function getLogoutUrl() {
  return '/auth/logout';
}

export async function getPreferences() {
  try {
    const response = await fetch(`${API_BASE_URL}/preferences`, {
      credentials: 'include',
    });
    if (!response.ok) {
      return { last_conversation_id: null, default_model_id: null };
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return { last_conversation_id: null, default_model_id: null };
  }
}

export async function updatePreferences(preferences) {
  try {
    const response = await fetch(`${API_BASE_URL}/preferences`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preferences),
    });
    if (!response.ok) {
      throw new Error('Failed to update preferences');
    }
    return response.json();
  } catch (error) {
    console.error('Error updating preferences:', error);
    throw error;
  }
}
