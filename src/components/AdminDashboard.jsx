import { useState, useEffect } from 'react';
import * as api from '../lib/api';

function AdminDashboard({ isOpen, onClose }) {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [billing, setBilling] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchStats();
    }
  }, [isOpen]);

  useEffect(() => {
    async function loadUsers() {
      try {
        const data = await api.getUsers(currentPage, 20, searchQuery);
        setUsers(data.users);
        setPagination(data.pagination);
      } catch {
        setError('Failed to load users');
      }
    }
    if (isOpen && activeTab === 'users') {
      loadUsers();
    }
  }, [isOpen, activeTab, currentPage, searchQuery]);

  useEffect(() => {
    if (isOpen && activeTab === 'billing') {
      fetchBilling();
    }
  }, [isOpen, activeTab]);

  async function fetchStats() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAdminStats();
      setStats(data);
    } catch (err) {
      if (err.message === 'Unauthorized') {
        setError('You do not have admin access');
      } else {
        setError('Failed to load admin stats');
      }
    } finally {
      setLoading(false);
    }
  }

  async function fetchBilling() {
    try {
      const data = await api.getBillingStats();
      setBilling(data);
    } catch {
      setError('Failed to load billing stats');
    }
  }

  async function fetchUserDetails(userId) {
    try {
      const data = await api.getUserDetails(userId);
      setUserDetails(data);
      setSelectedUser(userId);
    } catch {
      setError('Failed to load user details');
    }
  }

  async function handleUpdateSubscription(userId, status) {
    try {
      await api.updateUser(userId, { subscription_status: status });
      fetchUsers();
      if (selectedUser === userId) {
        fetchUserDetails(userId);
      }
    } catch {
      setError('Failed to update user');
    }
  }

  function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toString() || '0';
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-[#2f2f2f] rounded-xl shadow-2xl w-full max-w-5xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gpt-border">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'text-gpt-text border-blue-500'
                  : 'text-gpt-muted border-transparent hover:text-gpt-text'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
                activeTab === 'users'
                  ? 'text-gpt-text border-blue-500'
                  : 'text-gpt-muted border-transparent hover:text-gpt-text'
              }`}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab('billing')}
              className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
                activeTab === 'billing'
                  ? 'text-gpt-text border-blue-500'
                  : 'text-gpt-muted border-transparent hover:text-gpt-text'
              }`}
            >
              Billing
            </button>
          </div>
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

        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {loading && activeTab === 'overview' ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-gpt-muted border-t-gpt-accent rounded-full" />
            </div>
          ) : (
            activeTab === 'overview' &&
            stats && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard title="Total Users" value={formatNumber(stats.users?.total_users)} />
                  <StatCard
                    title="Active Subscribers"
                    value={formatNumber(stats.users?.active_subscribers)}
                  />
                  <StatCard
                    title="New Users (7d)"
                    value={formatNumber(stats.users?.new_users_7d)}
                  />
                  <StatCard
                    title="New Users (30d)"
                    value={formatNumber(stats.users?.new_users_30d)}
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard
                    title="Total Conversations"
                    value={formatNumber(stats.conversations?.total_conversations)}
                  />
                  <StatCard
                    title="Total Messages"
                    value={formatNumber(stats.messages?.total_messages)}
                  />
                  <StatCard title="Total Tokens" value={formatNumber(stats.usage?.total_tokens)} />
                  <StatCard title="Total Teams" value={formatNumber(stats.teams?.total_teams)} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-[#3f3f3f] rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gpt-muted mb-3">Top Models (30d)</h3>
                    <div className="space-y-2">
                      {stats.topModels?.slice(0, 5).map((model, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-gpt-text truncate flex-1">{model.model_id}</span>
                          <span className="text-gpt-muted ml-2">
                            {formatNumber(model.request_count)} requests
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#3f3f3f] rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gpt-muted mb-3">
                      Daily Active Users (30d)
                    </h3>
                    <div className="h-32 flex items-end gap-1">
                      {stats.dailyActiveUsers
                        ?.slice(0, 30)
                        .reverse()
                        .map((day, i) => {
                          const maxUsers = Math.max(
                            ...stats.dailyActiveUsers.map((d) => d.active_users)
                          );
                          const height = maxUsers > 0 ? (day.active_users / maxUsers) * 100 : 0;
                          return (
                            <div
                              key={i}
                              className="flex-1 bg-blue-500 rounded-t"
                              style={{ height: `${height}%` }}
                              title={`${day.date}: ${day.active_users} users`}
                            />
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>
            )
          )}

          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search by email or name..."
                  className="flex-1 p-2 bg-[#3f3f3f] text-gpt-text text-sm rounded-lg border border-gpt-border focus:outline-none focus:border-blue-500"
                />
              </div>

              {selectedUser && userDetails ? (
                <div className="space-y-4">
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setUserDetails(null);
                    }}
                    className="text-gpt-muted hover:text-gpt-text text-sm"
                  >
                    ← Back to users
                  </button>

                  <div className="bg-[#3f3f3f] rounded-lg p-4">
                    <div className="flex items-center gap-4 mb-4">
                      {userDetails.user.picture && (
                        <img
                          src={userDetails.user.picture}
                          alt=""
                          className="w-12 h-12 rounded-full"
                        />
                      )}
                      <div>
                        <h3 className="text-lg font-medium text-gpt-text">
                          {userDetails.user.name}
                        </h3>
                        <p className="text-sm text-gpt-muted">{userDetails.user.email}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gpt-muted">Status</p>
                        <p className="text-sm text-gpt-text capitalize">
                          {userDetails.user.subscription_status}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gpt-muted">Conversations</p>
                        <p className="text-sm text-gpt-text">
                          {userDetails.user.conversation_count}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gpt-muted">Messages</p>
                        <p className="text-sm text-gpt-text">{userDetails.user.message_count}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gpt-muted">Joined</p>
                        <p className="text-sm text-gpt-text">
                          {new Date(userDetails.user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <select
                        value={userDetails.user.subscription_status}
                        onChange={(e) => handleUpdateSubscription(selectedUser, e.target.value)}
                        className="p-2 bg-[#2f2f2f] text-gpt-text text-sm rounded border border-gpt-border"
                      >
                        <option value="free">Free</option>
                        <option value="active">Active</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="expired">Expired</option>
                      </select>
                    </div>
                  </div>

                  {userDetails.teams?.length > 0 && (
                    <div className="bg-[#3f3f3f] rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gpt-muted mb-2">Teams</h4>
                      <div className="space-y-1">
                        {userDetails.teams.map((team) => (
                          <div key={team.id} className="text-sm text-gpt-text">
                            {team.name} ({team.role})
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="bg-[#3f3f3f] rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-[#2f2f2f]">
                        <tr>
                          <th className="text-left p-3 text-gpt-muted font-medium">User</th>
                          <th className="text-left p-3 text-gpt-muted font-medium">Status</th>
                          <th className="text-right p-3 text-gpt-muted font-medium">Chats</th>
                          <th className="text-right p-3 text-gpt-muted font-medium">Tokens</th>
                          <th className="text-right p-3 text-gpt-muted font-medium">Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr
                            key={user.id}
                            onClick={() => fetchUserDetails(user.id)}
                            className="border-t border-gpt-border hover:bg-[#4f4f4f] cursor-pointer"
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                {user.picture && (
                                  <img src={user.picture} alt="" className="w-6 h-6 rounded-full" />
                                )}
                                <div>
                                  <p className="text-gpt-text">{user.name}</p>
                                  <p className="text-xs text-gpt-muted">{user.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded text-xs ${
                                  user.subscription_status === 'active'
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-gray-500/20 text-gray-400'
                                }`}
                              >
                                {user.subscription_status}
                              </span>
                            </td>
                            <td className="p-3 text-right text-gpt-muted">
                              {user.conversation_count}
                            </td>
                            <td className="p-3 text-right text-gpt-muted">
                              {formatNumber(user.total_tokens)}
                            </td>
                            <td className="p-3 text-right text-gpt-muted">
                              {new Date(user.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {pagination && pagination.totalPages > 1 && (
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm bg-[#3f3f3f] text-gpt-text rounded disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1 text-sm text-gpt-muted">
                        Page {currentPage} of {pagination.totalPages}
                      </span>
                      <button
                        onClick={() =>
                          setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))
                        }
                        disabled={currentPage === pagination.totalPages}
                        className="px-3 py-1 text-sm bg-[#3f3f3f] text-gpt-text rounded disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'billing' && billing && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {billing.subscriptionBreakdown?.map((item) => (
                  <StatCard
                    key={item.subscription_status}
                    title={
                      item.subscription_status.charAt(0).toUpperCase() +
                      item.subscription_status.slice(1)
                    }
                    value={item.count}
                  />
                ))}
              </div>

              <div className="bg-[#3f3f3f] rounded-lg p-4">
                <h3 className="text-sm font-medium text-gpt-muted mb-3">
                  Top Users by Token Usage (30d)
                </h3>
                <div className="space-y-2">
                  {billing.topUsers?.slice(0, 10).map((user, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-gpt-muted w-4">{i + 1}.</span>
                        <span className="text-gpt-text truncate">{user.email}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs ${
                            user.subscription_status === 'active'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}
                        >
                          {user.subscription_status}
                        </span>
                      </div>
                      <span className="text-gpt-muted ml-2">
                        {formatNumber(user.total_tokens)} tokens
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#3f3f3f] rounded-lg p-4">
                <h3 className="text-sm font-medium text-gpt-muted mb-3">Monthly Usage</h3>
                <div className="space-y-2">
                  {billing.monthlyUsage?.slice(0, 6).map((month, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gpt-text">
                        {new Date(month.month).toLocaleDateString('en-US', {
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="text-gpt-muted">
                        {formatNumber(month.requests)} requests • {formatNumber(month.tokens)}{' '}
                        tokens • {month.unique_users} users
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="bg-[#3f3f3f] rounded-lg p-4">
      <p className="text-xs text-gpt-muted mb-1">{title}</p>
      <p className="text-2xl font-semibold text-gpt-text">{value}</p>
    </div>
  );
}

export default AdminDashboard;
