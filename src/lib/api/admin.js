import { API_BASE_URL } from './config';

export async function getAdminStats(refresh = false) {
  const params = refresh ? '?refresh=true' : '';
  const response = await fetch(`${API_BASE_URL}/admin/stats${params}`, {
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to fetch admin stats');
  }
  return response.json();
}

export async function getUsers({
  cursor = '',
  limit = 50,
  search = '',
  status = '',
  sortBy = 'created_at',
  sortOrder = 'desc',
} = {}) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  if (sortBy) params.set('sortBy', sortBy);
  if (sortOrder) params.set('sortOrder', sortOrder);

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

export async function bulkUpdateUsers(userIds, action, value) {
  const response = await fetch(`${API_BASE_URL}/admin/users/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ userIds, action, value }),
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error('Unauthorized');
    const data = await response.json();
    throw new Error(data.error || 'Failed to perform bulk action');
  }
  return response.json();
}

export async function exportUsers(format = 'json', status = '') {
  const params = new URLSearchParams({ format });
  if (status) params.set('status', status);

  const response = await fetch(`${API_BASE_URL}/admin/users/export?${params}`, {
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to export users');
  }

  if (format === 'csv') {
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    return { success: true };
  }

  return response.json();
}

export async function getActivity() {
  const response = await fetch(`${API_BASE_URL}/admin/activity`, {
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to fetch activity');
  }
  return response.json();
}
