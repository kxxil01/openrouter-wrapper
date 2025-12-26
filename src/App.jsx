import { useState, useCallback, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import Sidebar from './components/Sidebar';
import LandingPage from './components/LandingPage';
import PaywallModal from './components/PaywallModal';
import SearchModal from './components/SearchModal';
import SystemPromptModal from './components/SystemPromptModal';
import * as api from './lib/api';
import {
  useModels,
  useConversations,
  useMessages,
  useAuth,
  useChat,
  useKeyboardShortcuts,
} from './hooks';

function App() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);

  const { user, isLoading: isAuthLoading, login, logout } = useAuth();
  const { models, selectedModel, setSelectedModel } = useModels();
  const {
    conversations,
    currentConversation,
    setCurrentConversation,
    deleteConversation,
    selectConversation,
    generateTitle,
    newChat,
    fetchConversations,
  } = useConversations();
  const { messages, setMessages, fetchMessages, clearMessages } = useMessages();

  const {
    isLoading,
    error,
    showPaywall,
    setShowPaywall,
    clearError,
    sendMessage,
    editMessage,
    regenerateResponse,
  } = useChat({
    currentConversation,
    setCurrentConversation,
    messages,
    setMessages,
    selectedModel,
    fetchConversations,
    generateTitle,
  });

  const handleNewChat = useCallback(() => {
    newChat();
    clearMessages();
    clearError();
  }, [newChat, clearMessages, clearError]);

  useKeyboardShortcuts({
    onSearch: () => setShowSearch(true),
    onToggleSidebar: () => setSidebarOpen((prev) => !prev),
    onNewChat: handleNewChat,
  });

  useEffect(() => {
    if (currentConversation) {
      fetchMessages(currentConversation.id);
      if (currentConversation.model_id) {
        const model = models.find((m) => m.id === currentConversation.model_id);
        if (model) {
          setSelectedModel(model);
        }
      }
    } else {
      clearMessages();
    }
  }, [currentConversation, fetchMessages, clearMessages]);

  const handleSelectConversation = useCallback(
    async (conversationId) => {
      selectConversation(conversationId);
      clearError();
      const conversation = conversations.find((c) => c.id === conversationId);
      if (conversation?.model_id) {
        const model = models.find((m) => m.id === conversation.model_id);
        if (model) {
          setSelectedModel(model);
        }
      }
    },
    [selectConversation, conversations, models, setSelectedModel, clearError]
  );

  const handleDeleteConversation = useCallback(
    async (conversationId) => {
      await deleteConversation(conversationId);
      if (currentConversation?.id === conversationId) {
        clearMessages();
      }
    },
    [deleteConversation, currentConversation, clearMessages]
  );

  const handleSearchSelect = useCallback(
    async (conversationId) => {
      await handleSelectConversation(conversationId);
      await fetchMessages(conversationId);
    },
    [handleSelectConversation, fetchMessages]
  );

  const handleSaveSystemPrompt = useCallback(
    async (systemPrompt) => {
      if (!currentConversation) return;
      try {
        const updated = await api.updateConversation(currentConversation.id, {
          system_prompt: systemPrompt,
        });
        setCurrentConversation(updated);
      } catch (err) {
        console.error('Failed to save system prompt:', err);
      }
    },
    [currentConversation, setCurrentConversation]
  );

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gpt-bg flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-gpt-muted border-t-gpt-accent rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage onLogin={login} />;
  }

  return (
    <div className="flex h-full">
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversation?.id}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        isLoading={isLoading}
        isOpen={isSidebarOpen}
        onToggle={() => setSidebarOpen(!isSidebarOpen)}
        user={user}
        onLogin={login}
        onLogout={logout}
      />
      <ChatInterface
        messages={messages}
        onSendMessage={sendMessage}
        onEditMessage={editMessage}
        onRegenerateResponse={regenerateResponse}
        isLoading={isLoading}
        error={error}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
        selectedModel={selectedModel}
        availableModels={models}
        onModelSelect={setSelectedModel}
        hasSystemPrompt={!!currentConversation?.system_prompt}
        onOpenSystemPrompt={() => setShowSystemPrompt(true)}
      />
      {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} />}
      <SearchModal
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onSelectConversation={handleSearchSelect}
      />
      <SystemPromptModal
        isOpen={showSystemPrompt}
        onClose={() => setShowSystemPrompt(false)}
        currentPrompt={currentConversation?.system_prompt}
        onSave={handleSaveSystemPrompt}
      />
    </div>
  );
}

export default App;
