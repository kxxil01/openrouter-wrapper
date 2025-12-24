import { useState, useCallback } from 'react';
import * as api from '../lib/api';

export function useMessages() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMessages = useCallback(async (conversationId) => {
    if (!conversationId) {
      setMessages([]);
      return [];
    }
    try {
      setIsLoading(true);
      const data = await api.getMessagesForConversation(conversationId);
      setMessages(data || []);
      return data;
    } catch (err) {
      console.error('Error fetching messages:', err);
      setMessages([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addMessage = useCallback((message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const updateStreamingMessage = useCallback((content) => {
    setMessages((prev) => {
      const updated = [...prev];
      const idx = updated.findIndex((m) => m.role === 'assistant' && m.isStreaming);
      if (idx !== -1) {
        updated[idx] = { ...updated[idx], content };
      }
      return updated;
    });
  }, []);

  const finalizeStreamingMessage = useCallback((content, conversationId) => {
    setMessages((prev) => {
      const updated = [...prev];
      const idx = updated.findIndex((m) => m.role === 'assistant' && m.isStreaming);
      if (idx !== -1) {
        updated[idx] = {
          role: 'assistant',
          content,
          conversation_id: conversationId,
          created_at: new Date().toISOString(),
        };
      }
      return updated;
    });
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    setMessages,
    isLoading,
    fetchMessages,
    addMessage,
    updateStreamingMessage,
    finalizeStreamingMessage,
    clearMessages,
  };
}
