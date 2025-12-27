import { API_BASE_URL } from './config';

export async function getBillingConfig() {
  const response = await fetch(`${API_BASE_URL}/billing/config`, {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to fetch billing config');
  }
  return response.json();
}

export async function createCheckoutSession(plan, interval) {
  const response = await fetch(`${API_BASE_URL}/billing/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ plan, interval }),
  });
  if (!response.ok) {
    throw new Error('Failed to create checkout session');
  }
  return response.json();
}

export async function createPortalSession() {
  const response = await fetch(`${API_BASE_URL}/billing/create-portal-session`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to create portal session');
  }
  return response.json();
}

export async function getSubscription() {
  const response = await fetch(`${API_BASE_URL}/billing/subscription`, {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to fetch subscription');
  }
  return response.json();
}

export async function verifySubscription() {
  const response = await fetch(`${API_BASE_URL}/billing/verify-subscription`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to verify subscription');
  }
  return response.json();
}
