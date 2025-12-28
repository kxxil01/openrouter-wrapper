import { useState, useEffect } from 'react';
import * as api from '../lib/api';

function TeamModal({ isOpen, onClose, onTeamSelect }) {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamDetails, setTeamDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('teams');
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTeams();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedTeam) {
      fetchTeamDetails(selectedTeam.id);
    }
  }, [selectedTeam]);

  async function fetchTeams() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTeams();
      setTeams(data.teams || []);
    } catch {
      setError('Failed to load teams');
    } finally {
      setLoading(false);
    }
  }

  async function fetchTeamDetails(teamId) {
    try {
      const data = await api.getTeam(teamId);
      setTeamDetails(data);
    } catch {
      setError('Failed to load team details');
    }
  }

  async function handleCreateTeam(e) {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    setCreating(true);
    setError(null);
    try {
      const data = await api.createTeam(newTeamName.trim(), newTeamDescription.trim());
      setTeams([...teams, data.team]);
      setNewTeamName('');
      setNewTeamDescription('');
      setSuccess('Team created successfully');
      setActiveTab('teams');
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleInvite(e) {
    e.preventDefault();
    if (!inviteEmail.trim() || !selectedTeam) return;

    setInviting(true);
    setError(null);
    try {
      await api.inviteToTeam(selectedTeam.id, inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      setSuccess('Invite sent successfully');
    } catch (err) {
      setError(err.message);
    } finally {
      setInviting(false);
    }
  }

  async function handleRemoveMember(userId) {
    if (!selectedTeam) return;
    try {
      await api.removeMember(selectedTeam.id, userId);
      fetchTeamDetails(selectedTeam.id);
      setSuccess('Member removed');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteTeam() {
    if (!selectedTeam) return;
    if (!confirm('Are you sure you want to delete this team?')) return;

    try {
      await api.deleteTeam(selectedTeam.id);
      setTeams(teams.filter((t) => t.id !== selectedTeam.id));
      setSelectedTeam(null);
      setTeamDetails(null);
      setSuccess('Team deleted');
    } catch (err) {
      setError(err.message);
    }
  }

  function handleSelectTeamForChat(team) {
    if (onTeamSelect) {
      onTeamSelect(team);
    }
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-[#2f2f2f] rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gpt-border">
          <div className="flex gap-4">
            <button
              onClick={() => {
                setActiveTab('teams');
                setSelectedTeam(null);
              }}
              className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
                activeTab === 'teams'
                  ? 'text-gpt-text border-blue-500'
                  : 'text-gpt-muted border-transparent hover:text-gpt-text'
              }`}
            >
              My Teams
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
                activeTab === 'create'
                  ? 'text-gpt-text border-blue-500'
                  : 'text-gpt-muted border-transparent hover:text-gpt-text'
              }`}
            >
              Create Team
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
          {success && (
            <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm">
              {success}
            </div>
          )}

          {activeTab === 'create' && (
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gpt-muted mb-2">Team Name</label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="My Team"
                  className="w-full p-3 bg-[#3f3f3f] text-gpt-text rounded-lg border border-gpt-border focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gpt-muted mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={newTeamDescription}
                  onChange={(e) => setNewTeamDescription(e.target.value)}
                  placeholder="What is this team for?"
                  rows={3}
                  className="w-full p-3 bg-[#3f3f3f] text-gpt-text rounded-lg border border-gpt-border focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={creating || !newTeamName.trim()}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? 'Creating...' : 'Create Team'}
              </button>
            </form>
          )}

          {activeTab === 'teams' && !selectedTeam && (
            <div className="space-y-3">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-2 border-gpt-muted border-t-gpt-accent rounded-full" />
                </div>
              ) : teams.length === 0 ? (
                <div className="text-center py-8 text-gpt-muted">
                  <p className="mb-4">You&apos;re not part of any teams yet.</p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="text-blue-400 hover:underline"
                  >
                    Create your first team
                  </button>
                </div>
              ) : (
                teams.map((team) => (
                  <div
                    key={team.id}
                    className="p-4 bg-[#3f3f3f] rounded-lg hover:bg-[#4f4f4f] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gpt-text">{team.name}</h3>
                        <p className="text-sm text-gpt-muted">
                          {team.member_count} member{team.member_count !== 1 ? 's' : ''} •{' '}
                          {team.user_role}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSelectTeamForChat(team)}
                          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          View Chats
                        </button>
                        <button
                          onClick={() => setSelectedTeam(team)}
                          className="px-3 py-1.5 text-sm text-gpt-muted hover:text-gpt-text transition-colors"
                        >
                          Manage
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'teams' && selectedTeam && teamDetails && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedTeam(null);
                    setTeamDetails(null);
                  }}
                  className="text-gpt-muted hover:text-gpt-text"
                >
                  ← Back
                </button>
                <h2 className="text-lg font-semibold text-gpt-text">{selectedTeam.name}</h2>
              </div>

              <section>
                <h3 className="text-sm font-medium text-gpt-muted mb-3">
                  Members ({teamDetails.members?.length || 0})
                </h3>
                <div className="space-y-2">
                  {teamDetails.members?.map((member) => (
                    <div
                      key={member.user_id}
                      className="flex items-center justify-between p-3 bg-[#3f3f3f] rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {member.picture && (
                          <img src={member.picture} alt="" className="w-8 h-8 rounded-full" />
                        )}
                        <div>
                          <p className="text-sm text-gpt-text">{member.name}</p>
                          <p className="text-xs text-gpt-muted">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gpt-muted capitalize">{member.role}</span>
                        {member.role !== 'owner' && teamDetails.userRole === 'owner' && (
                          <button
                            onClick={() => handleRemoveMember(member.user_id)}
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {['owner', 'admin'].includes(teamDetails.userRole) && (
                <section>
                  <h3 className="text-sm font-medium text-gpt-muted mb-3">Invite Member</h3>
                  <form onSubmit={handleInvite} className="flex gap-2">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="flex-1 p-2 bg-[#3f3f3f] text-gpt-text text-sm rounded-lg border border-gpt-border focus:outline-none focus:border-blue-500"
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="p-2 bg-[#3f3f3f] text-gpt-text text-sm rounded-lg border border-gpt-border"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      type="submit"
                      disabled={inviting || !inviteEmail.trim()}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {inviting ? '...' : 'Invite'}
                    </button>
                  </form>
                </section>
              )}

              {teamDetails.userRole === 'owner' && (
                <section className="pt-4 border-t border-gpt-border">
                  <button
                    onClick={handleDeleteTeam}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Delete Team
                  </button>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TeamModal;
