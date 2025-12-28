import { useState, useEffect, useCallback } from 'react';
import * as api from '../lib/api';

function AdminDashboard({ isOpen, onClose }) {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [billing, setBilling] = useState(null);
  const [activity, setActivity] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [cursor, setCursor] = useState('');
  const [cursorHistory, setCursorHistory] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [bulkValue, setBulkValue] = useState('');
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchStats();
    }
  }, [isOpen]);

  const loadUsers = useCallback(
    async (newCursor = '') => {
      try {
        const data = await api.getUsers({
          cursor: newCursor,
          limit: 20,
          search: searchQuery,
          status: statusFilter,
          sortBy,
          sortOrder,
        });
        setUsers(data.users);
        setPagination(data.pagination);
        setSelectedUsers(new Set());
      } catch {
        setError('Failed to load users');
      }
    },
    [searchQuery, statusFilter, sortBy, sortOrder]
  );

  useEffect(() => {
    if (isOpen && activeTab === 'users') {
      setCursor('');
      setCursorHistory([]);
      loadUsers('');
    }
  }, [isOpen, activeTab, searchQuery, statusFilter, sortBy, sortOrder, loadUsers]);

  useEffect(() => {
    if (isOpen && activeTab === 'activity') {
      fetchActivity();
    }
  }, [isOpen, activeTab]);

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

  async function fetchActivity() {
    try {
      const data = await api.getActivity();
      setActivity(data);
    } catch {
      setError('Failed to load activity');
    }
  }

  async function handleBulkAction() {
    if (selectedUsers.size === 0) {
      setError('No users selected');
      return;
    }
    if (!bulkAction) {
      setError('Please select an action');
      return;
    }
    if ((bulkAction === 'update_status' || bulkAction === 'update_user_type') && !bulkValue) {
      setError('Please select a value');
      return;
    }

    try {
      const result = await api.bulkUpdateUsers(Array.from(selectedUsers), bulkAction, bulkValue);
      setSuccess(`Successfully updated ${result.affected} users`);
      setShowBulkConfirm(false);
      setSelectedUsers(new Set());
      setBulkAction('');
      setBulkValue('');
      loadUsers(cursor);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to perform bulk action');
    }
  }

  async function handleExport(format) {
    setExporting(true);
    try {
      await api.exportUsers(format, statusFilter);
      if (format === 'json') {
        setSuccess('Export downloaded');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch {
      setError('Failed to export users');
    } finally {
      setExporting(false);
    }
  }

  function toggleUserSelection(userId) {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map((u) => u.id)));
    }
  }

  function handleNextPage() {
    if (pagination?.cursor) {
      setCursorHistory((prev) => [...prev, cursor]);
      setCursor(pagination.cursor);
      loadUsers(pagination.cursor);
    }
  }

  function handlePrevPage() {
    if (cursorHistory.length > 0) {
      const prevCursor = cursorHistory[cursorHistory.length - 1];
      setCursorHistory((prev) => prev.slice(0, -1));
      setCursor(prevCursor);
      loadUsers(prevCursor);
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
            {['overview', 'users', 'activity', 'billing'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-sm font-medium pb-1 border-b-2 transition-colors capitalize ${
                  activeTab === tab
                    ? 'text-gpt-text border-blue-500'
                    : 'text-gpt-muted border-transparent hover:text-gpt-text'
                }`}
              >
                {tab}
              </button>
            ))}
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

          {success && (
            <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm">
              {success}
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
              <div className="flex flex-wrap gap-2 items-center">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by email or name..."
                  className="flex-1 min-w-[200px] p-2 bg-[#3f3f3f] text-gpt-text text-sm rounded-lg border border-gpt-border focus:outline-none focus:border-blue-500"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="p-2 bg-[#3f3f3f] text-gpt-text text-sm rounded-lg border border-gpt-border"
                >
                  <option value="">All Status</option>
                  <option value="free">Free</option>
                  <option value="active">Active</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="expired">Expired</option>
                  <option value="past_due">Past Due</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="p-2 bg-[#3f3f3f] text-gpt-text text-sm rounded-lg border border-gpt-border"
                >
                  <option value="created_at">Joined</option>
                  <option value="email">Email</option>
                  <option value="name">Name</option>
                  <option value="subscription_status">Status</option>
                </select>
                <button
                  onClick={() => setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
                  className="p-2 bg-[#3f3f3f] text-gpt-text text-sm rounded-lg border border-gpt-border hover:bg-[#4f4f4f]"
                  title={sortOrder === 'desc' ? 'Descending' : 'Ascending'}
                >
                  {sortOrder === 'desc' ? '↓' : '↑'}
                </button>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleExport('csv')}
                    disabled={exporting}
                    className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg disabled:opacity-50"
                  >
                    {exporting ? '...' : 'CSV'}
                  </button>
                  <button
                    onClick={() => handleExport('json')}
                    disabled={exporting}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg disabled:opacity-50"
                  >
                    JSON
                  </button>
                </div>
              </div>

              {selectedUsers.size > 0 && (
                <div className="flex items-center gap-2 p-3 bg-blue-500/20 rounded-lg">
                  <span className="text-sm text-gpt-text">{selectedUsers.size} selected</span>
                  <select
                    value={bulkAction}
                    onChange={(e) => {
                      setBulkAction(e.target.value);
                      setBulkValue('');
                    }}
                    className="p-1.5 bg-[#3f3f3f] text-gpt-text text-sm rounded border border-gpt-border"
                  >
                    <option value="">Select action...</option>
                    <option value="update_status">Update Status</option>
                    <option value="update_user_type">Update Role</option>
                    <option value="delete">Delete Users</option>
                  </select>
                  {bulkAction === 'update_status' && (
                    <select
                      value={bulkValue}
                      onChange={(e) => setBulkValue(e.target.value)}
                      className="p-1.5 bg-[#3f3f3f] text-gpt-text text-sm rounded border border-gpt-border"
                    >
                      <option value="">Select status...</option>
                      <option value="free">Free</option>
                      <option value="active">Active</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="expired">Expired</option>
                    </select>
                  )}
                  {bulkAction === 'update_user_type' && (
                    <select
                      value={bulkValue}
                      onChange={(e) => setBulkValue(e.target.value)}
                      className="p-1.5 bg-[#3f3f3f] text-gpt-text text-sm rounded border border-gpt-border"
                    >
                      <option value="">Select role...</option>
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="superadmin">Superadmin</option>
                    </select>
                  )}
                  {bulkAction && (
                    <button
                      onClick={() => setShowBulkConfirm(true)}
                      className={`px-3 py-1.5 text-sm rounded ${
                        bulkAction === 'delete'
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-blue-600 hover:bg-blue-700'
                      } text-white`}
                    >
                      Apply
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedUsers(new Set())}
                    className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded"
                  >
                    Clear
                  </button>
                </div>
              )}

              {showBulkConfirm && (
                <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                  <p className="text-sm text-gpt-text mb-3">
                    Are you sure you want to {bulkAction.replace('_', ' ')} {selectedUsers.size}{' '}
                    users?
                    {bulkAction === 'delete' && ' This action cannot be undone.'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleBulkAction}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setShowBulkConfirm(false)}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

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
                          <th className="p-3 w-8">
                            <input
                              type="checkbox"
                              checked={selectedUsers.size === users.length && users.length > 0}
                              onChange={toggleSelectAll}
                              className="rounded"
                            />
                          </th>
                          <th className="text-left p-3 text-gpt-muted font-medium">User</th>
                          <th className="text-left p-3 text-gpt-muted font-medium">Status</th>
                          <th className="text-left p-3 text-gpt-muted font-medium">Role</th>
                          <th className="text-right p-3 text-gpt-muted font-medium">Chats</th>
                          <th className="text-right p-3 text-gpt-muted font-medium">Tokens</th>
                          <th className="text-right p-3 text-gpt-muted font-medium">Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr
                            key={user.id}
                            className={`border-t border-gpt-border hover:bg-[#4f4f4f] cursor-pointer ${
                              selectedUsers.has(user.id) ? 'bg-blue-500/10' : ''
                            }`}
                          >
                            <td className="p-3" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedUsers.has(user.id)}
                                onChange={() => toggleUserSelection(user.id)}
                                className="rounded"
                              />
                            </td>
                            <td className="p-3" onClick={() => fetchUserDetails(user.id)}>
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
                            <td className="p-3" onClick={() => fetchUserDetails(user.id)}>
                              <span
                                className={`px-2 py-0.5 rounded text-xs ${
                                  user.subscription_status === 'active'
                                    ? 'bg-green-500/20 text-green-400'
                                    : user.subscription_status === 'past_due'
                                      ? 'bg-red-500/20 text-red-400'
                                      : 'bg-gray-500/20 text-gray-400'
                                }`}
                              >
                                {user.subscription_status}
                              </span>
                            </td>
                            <td
                              className="p-3 text-gpt-muted"
                              onClick={() => fetchUserDetails(user.id)}
                            >
                              <span
                                className={`text-xs ${user.user_type === 'superadmin' ? 'text-purple-400' : user.user_type === 'admin' ? 'text-blue-400' : ''}`}
                              >
                                {user.user_type || 'user'}
                              </span>
                            </td>
                            <td
                              className="p-3 text-right text-gpt-muted"
                              onClick={() => fetchUserDetails(user.id)}
                            >
                              {user.conversation_count}
                            </td>
                            <td
                              className="p-3 text-right text-gpt-muted"
                              onClick={() => fetchUserDetails(user.id)}
                            >
                              {formatNumber(user.total_tokens)}
                            </td>
                            <td
                              className="p-3 text-right text-gpt-muted"
                              onClick={() => fetchUserDetails(user.id)}
                            >
                              {new Date(user.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gpt-muted">
                      {pagination?.total || 0} total users
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={handlePrevPage}
                        disabled={cursorHistory.length === 0}
                        className="px-3 py-1 text-sm bg-[#3f3f3f] text-gpt-text rounded disabled:opacity-50 hover:bg-[#4f4f4f]"
                      >
                        Previous
                      </button>
                      <button
                        onClick={handleNextPage}
                        disabled={!pagination?.hasMore}
                        className="px-3 py-1 text-sm bg-[#3f3f3f] text-gpt-text rounded disabled:opacity-50 hover:bg-[#4f4f4f]"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'activity' && activity && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#3f3f3f] rounded-lg p-4">
                  <h3 className="text-gpt-text font-medium mb-3">Recent Signups</h3>
                  <div className="space-y-2">
                    {activity.recentSignups?.map((user) => (
                      <div key={user.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="text-gpt-text">{user.name || user.email}</span>
                          <span
                            className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                              user.subscription_status === 'active'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-gray-500/20 text-gray-400'
                            }`}
                          >
                            {user.subscription_status}
                          </span>
                        </div>
                        <span className="text-gpt-muted text-xs">
                          {new Date(user.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#3f3f3f] rounded-lg p-4">
                  <h3 className="text-gpt-text font-medium mb-3">Recent Conversations</h3>
                  <div className="space-y-2">
                    {activity.recentConversations?.map((conv) => (
                      <div key={conv.id} className="flex items-center justify-between text-sm">
                        <div className="truncate flex-1 mr-2">
                          <span className="text-gpt-text">{conv.title || 'Untitled'}</span>
                          <span className="text-gpt-muted text-xs ml-2">{conv.user_email}</span>
                        </div>
                        <span className="text-gpt-muted text-xs whitespace-nowrap">
                          {new Date(conv.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-[#3f3f3f] rounded-lg p-4">
                <h3 className="text-gpt-text font-medium mb-3">Hourly Activity (24h)</h3>
                <div className="flex items-end gap-1 h-24">
                  {activity.hourlyActivity
                    ?.slice(0, 24)
                    .reverse()
                    .map((hour, i) => {
                      const maxCount = Math.max(
                        ...activity.hourlyActivity.map((h) => parseInt(h.message_count) || 0)
                      );
                      const height =
                        maxCount > 0 ? (parseInt(hour.message_count) / maxCount) * 100 : 0;
                      return (
                        <div
                          key={i}
                          className="flex-1 bg-blue-500/50 rounded-t hover:bg-blue-500/70 transition-colors"
                          style={{ height: `${Math.max(height, 2)}%` }}
                          title={`${hour.message_count} messages at ${new Date(hour.hour).toLocaleTimeString()}`}
                        />
                      );
                    })}
                </div>
                <div className="flex justify-between text-xs text-gpt-muted mt-1">
                  <span>24h ago</span>
                  <span>Now</span>
                </div>
              </div>

              <div className="bg-[#3f3f3f] rounded-lg p-4">
                <h3 className="text-gpt-text font-medium mb-3">Recent API Usage</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {activity.recentUsage?.map((usage, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gpt-muted text-xs font-mono">
                          {usage.model_id?.split('/').pop()}
                        </span>
                        <span className="text-gpt-text">
                          {formatNumber(usage.total_tokens)} tokens
                        </span>
                      </div>
                      <span className="text-gpt-muted text-xs">{usage.user_email}</span>
                    </div>
                  ))}
                </div>
              </div>
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
