import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as api from '../lib/api';

function SearchModal({ isOpen, onClose, onSelectConversation }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ conversations: [], messages: [] });
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults({ conversations: [], messages: [] });
    }
  }, [isOpen]);

  const performSearch = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults({ conversations: [], messages: [] });
      return;
    }

    setIsLoading(true);
    try {
      const data = await api.searchConversations(searchQuery);
      setResults(data);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleResultClick = (conversationId) => {
    onSelectConversation(conversationId);
    onClose();
  };

  if (!isOpen) return null;

  const hasResults = results.conversations.length > 0 || results.messages.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl mx-4 bg-gpt-sidebar border border-gpt-border rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center px-4 py-3 border-b border-gpt-border">
          <svg
            className="w-5 h-5 text-gpt-muted mr-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Search conversations..."
            className="flex-1 bg-transparent text-gpt-text placeholder-gpt-muted outline-none text-base"
          />
          {isLoading && (
            <div className="w-5 h-5 border-2 border-gpt-muted border-t-transparent rounded-full animate-spin" />
          )}
          <button
            onClick={onClose}
            className="ml-3 text-gpt-muted hover:text-gpt-text transition-colors"
          >
            <kbd className="px-2 py-1 text-xs bg-gpt-main rounded border border-gpt-border">
              ESC
            </kbd>
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {query && !isLoading && !hasResults && (
            <div className="px-4 py-8 text-center text-gpt-muted">
              No results found for &quot;{query}&quot;
            </div>
          )}

          {results.conversations.length > 0 && (
            <div className="p-2">
              <div className="px-2 py-1 text-xs font-medium text-gpt-muted uppercase tracking-wider">
                Conversations
              </div>
              {results.conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleResultClick(conv.id)}
                  className="w-full px-3 py-2 text-left rounded-lg hover:bg-gpt-hover transition-colors"
                >
                  <div className="text-sm text-gpt-text font-medium truncate">{conv.title}</div>
                  <div className="text-xs text-gpt-muted mt-0.5">
                    {new Date(conv.updated_at).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          )}

          {results.messages.length > 0 && (
            <div className="p-2 border-t border-gpt-border">
              <div className="px-2 py-1 text-xs font-medium text-gpt-muted uppercase tracking-wider">
                Messages
              </div>
              {results.messages.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => handleResultClick(msg.conversation_id)}
                  className="w-full px-3 py-2 text-left rounded-lg hover:bg-gpt-hover transition-colors"
                >
                  <div className="text-xs text-gpt-muted mb-1">
                    {msg.conversation_title} • {msg.role}
                  </div>
                  <div
                    className="text-sm text-gpt-text line-clamp-2"
                    dangerouslySetInnerHTML={{ __html: msg.highlight }}
                  />
                </button>
              ))}
            </div>
          )}

          {!query && (
            <div className="px-4 py-8 text-center text-gpt-muted">
              <p className="text-sm">Search through your conversations</p>
              <p className="text-xs mt-2">
                Press{' '}
                <kbd className="px-1.5 py-0.5 bg-gpt-main rounded border border-gpt-border">⌘K</kbd>{' '}
                anytime to open search
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SearchModal;
