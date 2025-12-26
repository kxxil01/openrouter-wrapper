import { useState } from 'react';
import * as api from '../lib/api';

function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  isLoading,
  isOpen,
  _onToggle,
  user,
  onLogin,
  onLogout,
  folders = [],
  onCreateFolder,
  onDeleteFolder,
  onMoveToFolder,
  onShareConversation,
  onOpenProfile,
}) {
  const [expandedFolders, setExpandedFolders] = useState({});
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const handleExport = async (e, conversationId, format) => {
    e.stopPropagation();
    try {
      await api.exportConversation(conversationId, format);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleShare = async (e, conversation) => {
    e.stopPropagation();
    try {
      if (conversation.is_shared && conversation.share_id) {
        const shareUrl = `${window.location.origin}/share/${conversation.share_id}`;
        await navigator.clipboard.writeText(shareUrl);
        alert('Share link copied to clipboard!');
      } else {
        const result = await api.shareConversation(conversation.id);
        const shareUrl = `${window.location.origin}${result.share_url}`;
        await navigator.clipboard.writeText(shareUrl);
        alert('Conversation shared! Link copied to clipboard.');
        if (onShareConversation) onShareConversation(conversation.id);
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const toggleFolder = (folderId) => {
    setExpandedFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setShowNewFolder(false);
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

  const unfolderedConversations = conversations.filter((c) => !c.folder_id);
  const getConversationsInFolder = (folderId) =>
    conversations.filter((c) => c.folder_id === folderId);

  const renderConversation = (conversation) => {
    const isMenuOpen = openMenuId === conversation.id;
    return (
      <div
        key={conversation.id}
        className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm ${
          currentConversationId === conversation.id
            ? 'bg-gpt-hover text-gpt-text'
            : 'text-gpt-muted hover:bg-gpt-hover hover:text-gpt-text'
        }`}
        onClick={() => onSelectConversation(conversation.id)}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="shrink-0"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span className="flex-1 truncate">{conversation.title}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isMenuOpen) {
              const rect = e.currentTarget.getBoundingClientRect();
              setMenuPosition({ top: rect.bottom + 4, left: rect.right - 112 });
            }
            setOpenMenuId(isMenuOpen ? null : conversation.id);
          }}
          className={`${isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} p-1 text-gpt-muted hover:text-gpt-text transition-opacity`}
          title="More options"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
        {isMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(null);
              }}
            />
            <div
              className="fixed z-50 w-28 bg-[#2f2f2f] border border-gpt-border rounded-md shadow-lg py-1"
              style={{ top: menuPosition.top, left: menuPosition.left }}
              onClick={(e) => e.stopPropagation()}
            >
              {folders.length > 0 && (
                <div className="px-2 py-1 border-b border-gpt-border">
                  <select
                    onChange={(e) => {
                      onMoveToFolder(conversation.id, e.target.value || null);
                      setOpenMenuId(null);
                    }}
                    value={conversation.folder_id || ''}
                    className="w-full bg-[#3f3f3f] text-gpt-text text-xs px-1 py-0.5 rounded border border-gpt-border cursor-pointer"
                  >
                    <option value="">No folder</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button
                onClick={(e) => {
                  handleShare(e, conversation);
                  setOpenMenuId(null);
                }}
                className="w-full flex items-center gap-2 px-2 py-1 text-xs text-gpt-muted hover:bg-[#3f3f3f] hover:text-gpt-text"
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                {conversation.is_shared ? 'Copy' : 'Share'}
              </button>
              <button
                onClick={(e) => {
                  handleExport(e, conversation.id, 'markdown');
                  setOpenMenuId(null);
                }}
                className="w-full flex items-center gap-2 px-2 py-1 text-xs text-gpt-muted hover:bg-[#3f3f3f] hover:text-gpt-text"
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Export
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConversation(conversation.id);
                  setOpenMenuId(null);
                }}
                className="w-full flex items-center gap-2 px-2 py-1 text-xs text-red-400 hover:bg-[#3f3f3f]"
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <aside
      className={`${isOpen ? 'w-[260px]' : 'w-0'} bg-gpt-sidebar flex flex-col h-full transition-all duration-200 overflow-hidden`}
    >
      <div className="flex flex-col h-full">
        <div className="p-2">
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-3 px-3 py-3 text-sm text-gpt-text rounded-lg border border-gpt-border hover:bg-gpt-hover transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            New chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin h-5 w-5 border-2 border-gpt-muted border-t-gpt-text rounded-full"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-gpt-muted text-sm">No conversations yet</div>
          ) : (
            <div className="space-y-1">
              {showNewFolder ? (
                <div className="flex items-center gap-2 px-3 py-2">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateFolder();
                      if (e.key === 'Escape') setShowNewFolder(false);
                    }}
                    placeholder="Folder name"
                    className="flex-1 bg-gpt-hover text-gpt-text text-sm px-2 py-1 rounded border border-gpt-border focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                  <button
                    onClick={handleCreateFolder}
                    className="p-1 text-green-500 hover:text-green-400"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setShowNewFolder(false)}
                    className="p-1 text-gpt-muted hover:text-red-400"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewFolder(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gpt-muted hover:text-gpt-text hover:bg-gpt-hover rounded-lg transition-colors"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  New folder
                </button>
              )}
              {folders.map((folder) => {
                const folderConvs = getConversationsInFolder(folder.id);
                const isExpanded = expandedFolders[folder.id] !== false;
                return (
                  <div key={folder.id}>
                    <div
                      className="group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm text-gpt-muted hover:bg-gpt-hover hover:text-gpt-text"
                      onClick={() => toggleFolder(folder.id)}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={folder.color}
                        strokeWidth="2"
                        className={`shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill={folder.color}
                        stroke={folder.color}
                        strokeWidth="2"
                        className="shrink-0"
                      >
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                      <span className="flex-1 truncate">{folder.name}</span>
                      <span className="text-xs text-gpt-muted">{folderConvs.length}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteFolder(folder.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gpt-muted hover:text-red-400"
                        title="Delete folder"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    {isExpanded && folderConvs.length > 0 && (
                      <div className="ml-4 space-y-0.5">{folderConvs.map(renderConversation)}</div>
                    )}
                  </div>
                );
              })}

              {unfolderedConversations.length > 0 && (
                <div className="pt-2 border-t border-gpt-border/30 mt-2">
                  <div className="space-y-0.5">
                    {unfolderedConversations.map(renderConversation)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-2 border-t border-gpt-border">
          {user ? (
            <div className="flex items-center gap-3 px-3 py-2">
              <img
                src={user.picture}
                alt={user.name}
                className="w-8 h-8 rounded-full shrink-0 object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gpt-text truncate">{user.name}</div>
                <div className="text-xs text-gpt-muted truncate">{user.email}</div>
              </div>
              <button
                onClick={onOpenProfile}
                className="p-1.5 text-gpt-muted hover:text-gpt-text rounded transition-colors"
                title="Settings"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
              <button
                onClick={onLogout}
                className="p-1.5 text-gpt-muted hover:text-gpt-text rounded transition-colors"
                title="Sign out"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={onLogin}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gpt-text hover:bg-gpt-hover rounded-lg transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Sign in with Google
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
