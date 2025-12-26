import { API_BASE_URL } from './config';

export async function getAdminStats() {
  const response = await fetch(`${API_BASE_URL}/admin/stats`, {
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to fetch admin stats');
  }
  return response.json();
}

export async function getUsers(page = 1, limit = 50, search = '') {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set('search', search);

  const response = await fetch(`${API_BASE_URL}/admin/users?${params}`, {
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to fetch users');
  }
  return response.json();
}

export async function getUserDetails(userId) {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to fetch user details');
  }
  return response.json();
}

export async function updateUser(userId, data) {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to update user');
  }
  return response.json();
}

export async function getBillingStats() {
  const response = await fetch(`${API_BASE_URL}/admin/billing`, {
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to fetch billing stats');
  }
  return response.json();
}
