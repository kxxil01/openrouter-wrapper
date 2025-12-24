import { useRef, useEffect } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ModelSelector from './ModelSelector';

function ChatInterface({
  messages,
  onSendMessage,
  onEditMessage,
  onRegenerateResponse,
  isLoading,
  error,
  _isSidebarOpen,
  onToggleSidebar,
  selectedModel,
  availableModels,
  onModelSelect,
}) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full flex-1 bg-gpt-bg">
      <div className="flex items-center h-14 px-4 border-b border-gpt-border/50">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-gpt-muted hover:text-gpt-text rounded-lg hover:bg-gpt-hover transition-colors"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 3v18" />
          </svg>
        </button>
        <div className="flex-1 flex items-center justify-center">
          <ModelSelector
            models={availableModels}
            selectedModel={selectedModel}
            onModelChange={onModelSelect}
          />
        </div>
        <div className="w-9"></div>
      </div>

      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-12 h-12 rounded-full bg-gpt-accent flex items-center justify-center mb-6">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
            >
              <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m9 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3" />
            </svg>
          </div>
          <h2 className="text-2xl font-medium text-gpt-text mb-2">How can I help you today?</h2>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <MessageList
            messages={messages}
            onEditMessage={onEditMessage}
            onRegenerateResponse={onRegenerateResponse}
          />
          <div ref={messagesEndRef} className="h-32" />
        </div>
      )}

      {error && (
        <div className="mx-auto max-w-3xl px-4 py-2">
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        </div>
      )}

      <div className="p-4 pb-8 bg-gradient-to-t from-gpt-bg via-gpt-bg to-transparent">
        <div className="max-w-2xl mx-auto">
          <MessageInput onSendMessage={onSendMessage} isLoading={isLoading} />
          <div className="text-[11px] text-gpt-muted/60 text-center mt-3">
            AI can make mistakes. Verify important information.
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatInterface;
