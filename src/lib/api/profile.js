import { API_BASE_URL } from './config';

export async function getProfile() {
  const response = await fetch(`${API_BASE_URL}/profile`, {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to fetch profile');
  }
  return response.json();
}

export async function updateApiKey(apiKey) {
  const response = await fetch(`${API_BASE_URL}/profile/api-key`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ api_key: apiKey }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update API key');
  }
  return response.json();
}

export async function removeApiKey() {
  const response = await fetch(`${API_BASE_URL}/profile/api-key`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to remove API key');
  }
  return response.json();
}

export async function getUsageAnalytics(period = '30d') {
  const response = await fetch(`${API_BASE_URL}/profile/usage?period=${period}`, {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to fetch usage analytics');
  }
  return response.json();
}
