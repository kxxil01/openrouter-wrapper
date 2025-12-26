import { API_BASE_URL } from './config';

export async function getTeams() {
  const response = await fetch(`${API_BASE_URL}/teams`, {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch teams');
  return response.json();
}

export async function createTeam(name, description) {
  const response = await fetch(`${API_BASE_URL}/teams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name, description }),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to create team');
  }
  return response.json();
}

export async function getTeam(teamId) {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}`, {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch team');
  return response.json();
}

export async function updateTeam(teamId, data) {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update team');
  return response.json();
}

export async function deleteTeam(teamId) {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to delete team');
  return response.json();
}

export async function inviteToTeam(teamId, email, role = 'member') {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, role }),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to send invite');
  }
  return response.json();
}

export async function joinTeam(token) {
  const response = await fetch(`${API_BASE_URL}/teams/join/${token}`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to join team');
  }
  return response.json();
}

export async function removeMember(teamId, userId) {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}/members/${userId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to remove member');
  return response.json();
}

export async function getTeamConversations(teamId) {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}/conversations`, {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch team conversations');
  return response.json();
}

export async function shareConversationWithTeam(teamId, conversationId) {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}/conversations/${conversationId}`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to share conversation');
  return response.json();
}

export async function removeConversationFromTeam(teamId, conversationId) {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}/conversations/${conversationId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to remove conversation');
  return response.json();
}
