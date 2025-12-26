import { API_BASE_URL } from './config';

export async function getFolders() {
  const response = await fetch(`${API_BASE_URL}/folders`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch folders');
  }

  return response.json();
}

export async function createFolder(name, color = '#6b7280') {
  const response = await fetch(`${API_BASE_URL}/folders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name, color }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create folder');
  }

  return response.json();
}

export async function updateFolder(id, updates) {
  const response = await fetch(`${API_BASE_URL}/folders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update folder');
  }

  return response.json();
}

export async function deleteFolder(id) {
  const response = await fetch(`${API_BASE_URL}/folders/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete folder');
  }

  return response.json();
}
