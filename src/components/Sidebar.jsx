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
}) {
  const handleExport = async (e, conversationId, format) => {
    e.stopPropagation();
    try {
      await api.exportConversation(conversationId, format);
    } catch (error) {
      console.error('Export failed:', error);
    }
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
            <div className="space-y-0.5">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm ${
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
                    onClick={(e) => handleExport(e, conversation.id, 'markdown')}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gpt-muted hover:text-blue-400 transition-opacity"
                    title="Export as Markdown"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(conversation.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gpt-muted hover:text-red-400 transition-opacity"
                    title="Delete"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))}
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
