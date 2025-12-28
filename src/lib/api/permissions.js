import { API_BASE_URL } from './config';

export async function getUserPermissions() {
  const response = await fetch(`${API_BASE_URL}/api/permissions`, {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to fetch permissions');
  }
  return response.json();
}
