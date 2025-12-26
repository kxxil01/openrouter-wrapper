import { useState, useEffect } from 'react';
import * as api from '../lib/api';

function ProfileModal({ isOpen, onClose }) {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchProfile();
    }
  }, [isOpen]);

  async function fetchProfile() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getProfile();
      setProfile(data.user);
      setStats(data.stats);
    } catch {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveApiKey() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.updateApiKey(apiKey || null);
      setSuccess('API key updated successfully');
      setApiKey('');
      fetchProfile();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveApiKey() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.removeApiKey();
      setSuccess('API key removed');
      fetchProfile();
    } catch {
      setError('Failed to remove API key');
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  const subscriptionColors = {
    free: 'bg-gray-500',
    active: 'bg-green-500',
    cancelled: 'bg-yellow-500',
    expired: 'bg-red-500',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-[#2f2f2f] rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gpt-border">
          <h2 className="text-lg font-semibold text-gpt-text">Profile & Settings</h2>
          <button onClick={onClose} className="p-1 text-gpt-muted hover:text-gpt-text">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin h-8 w-8 border-2 border-gpt-muted border-t-gpt-accent rounded-full" />
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm">
                {success}
              </div>
            )}

            <section>
              <h3 className="text-sm font-medium text-gpt-muted mb-3">Account</h3>
              <div className="flex items-center gap-4 p-3 bg-[#3f3f3f] rounded-lg">
                {profile?.picture && (
                  <img src={profile.picture} alt="" className="w-12 h-12 rounded-full" />
                )}
                <div className="flex-1">
                  <p className="font-medium text-gpt-text">{profile?.name}</p>
                  <p className="text-sm text-gpt-muted">{profile?.email}</p>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium text-white rounded ${subscriptionColors[profile?.subscription_status] || 'bg-gray-500'}`}
                >
                  {profile?.subscription_status?.toUpperCase()}
                </span>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-medium text-gpt-muted mb-3">Usage Statistics</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#3f3f3f] rounded-lg">
                  <p className="text-2xl font-bold text-gpt-text">
                    {stats?.total_conversations || 0}
                  </p>
                  <p className="text-xs text-gpt-muted">Conversations</p>
                </div>
                <div className="p-3 bg-[#3f3f3f] rounded-lg">
                  <p className="text-2xl font-bold text-gpt-text">{stats?.total_messages || 0}</p>
                  <p className="text-xs text-gpt-muted">Total Messages</p>
                </div>
                <div className="p-3 bg-[#3f3f3f] rounded-lg">
                  <p className="text-2xl font-bold text-gpt-text">
                    {profile?.message_count || 0}/5
                  </p>
                  <p className="text-xs text-gpt-muted">Messages Today</p>
                </div>
                <div className="p-3 bg-[#3f3f3f] rounded-lg">
                  <p className="text-2xl font-bold text-gpt-text">
                    {profile?.free_messages_remaining || 0}
                  </p>
                  <p className="text-xs text-gpt-muted">Free Remaining</p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-medium text-gpt-muted mb-3">OpenRouter API Key</h3>
              <p className="text-xs text-gpt-muted mb-3">
                Use your own API key to bypass usage limits. Get one at{' '}
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  openrouter.ai/keys
                </a>
              </p>
              {profile?.has_custom_api_key ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-2 bg-[#3f3f3f] rounded-lg text-sm text-gpt-text">
                    <span className="text-green-400">●</span> Custom API key configured
                  </div>
                  <button
                    onClick={handleRemoveApiKey}
                    disabled={saving}
                    className="px-3 py-2 text-sm text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-or-..."
                      className="w-full p-2 pr-10 bg-[#3f3f3f] text-gpt-text text-sm rounded-lg border border-gpt-border focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gpt-muted hover:text-gpt-text"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        {showApiKey ? (
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" />
                        ) : (
                          <>
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </>
                        )}
                      </svg>
                    </button>
                  </div>
                  <button
                    onClick={handleSaveApiKey}
                    disabled={saving || !apiKey}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </section>

            <section>
              <h3 className="text-sm font-medium text-gpt-muted mb-3">Subscription</h3>
              <div className="p-4 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-lg">
                <p className="text-sm text-gpt-text mb-2">
                  {profile?.subscription_status === 'active'
                    ? 'You have an active subscription. Enjoy unlimited messages!'
                    : 'Upgrade to Pro for unlimited messages and priority support.'}
                </p>
                {profile?.subscription_status !== 'active' && (
                  <button className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors">
                    Upgrade to Pro - $10/month
                  </button>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfileModal;
