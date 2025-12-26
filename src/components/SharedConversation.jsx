import { useState, useEffect } from 'react';
import MessageList from './MessageList';
import { API_BASE_URL } from '../lib/api/config';

function SharedConversation({ shareId }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchSharedConversation() {
      try {
        const response = await fetch(`${API_BASE_URL}/shared/${shareId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('Conversation not found or is no longer shared.');
          } else {
            setError('Failed to load conversation.');
          }
          return;
        }
        const data = await response.json();
        setConversation(data.conversation);
        setMessages(data.messages);
      } catch {
        setError('Failed to load conversation.');
      } finally {
        setLoading(false);
      }
    }
    fetchSharedConversation();
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gpt-bg flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-gpt-muted border-t-gpt-accent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gpt-bg flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gpt-text mb-4">Oops!</h1>
          <p className="text-gpt-muted">{error}</p>
          <a href="/" className="mt-4 inline-block text-blue-400 hover:underline">
            Go to homepage
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gpt-bg flex flex-col">
      <header className="border-b border-gpt-border px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gpt-text">{conversation?.title}</h1>
          <p className="text-sm text-gpt-muted">
            Shared by {conversation?.author_name} • {conversation?.model_id}
          </p>
        </div>
        <a
          href="/"
          className="px-4 py-2 bg-gpt-accent text-white rounded-lg hover:bg-gpt-accent/90 transition-colors text-sm"
        >
          Try it yourself
        </a>
      </header>
      <main className="flex-1 overflow-hidden">
        <MessageList messages={messages} isLoading={false} isSharedView={true} />
      </main>
    </div>
  );
}

export default SharedConversation;
