import { useState, useEffect, useCallback } from 'react';
import * as api from '../lib/api';

export function useConversations() {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.getConversations();
      setConversations(data || []);
      return data;
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError('Failed to load conversations');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createConversation = useCallback(async (title, modelId) => {
    try {
      setIsLoading(true);
      const newConversation = await api.createConversation(title, modelId);
      setConversations((prev) => [newConversation, ...prev]);
      setCurrentConversation(newConversation);
      return newConversation;
    } catch (err) {
      console.error('Error creating conversation:', err);
      setError('Failed to create conversation');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteConversation = useCallback(
    async (conversationId) => {
      try {
        setIsLoading(true);
        await api.deleteConversation(conversationId);
        setConversations((prev) => prev.filter((c) => c.id !== conversationId));
        if (currentConversation?.id === conversationId) {
          setCurrentConversation(null);
        }
        return true;
      } catch (err) {
        console.error('Error deleting conversation:', err);
        setError('Failed to delete conversation');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [currentConversation]
  );

  const selectConversation = useCallback(
    async (conversationId) => {
      const conversation = conversations.find((c) => c.id === conversationId);
      if (conversation) {
        setCurrentConversation(conversation);
        try {
          await api.updatePreferences({ last_conversation_id: conversationId });
        } catch (err) {
          console.error('Error saving preference:', err);
        }
      }
    },
    [conversations]
  );

  const generateTitle = useCallback(
    async (conversationId) => {
      try {
        const updated = await api.generateConversationTitle(conversationId);
        setConversations((prev) => prev.map((c) => (c.id === conversationId ? updated : c)));
        if (currentConversation?.id === conversationId) {
          setCurrentConversation(updated);
        }
        return updated;
      } catch (err) {
        console.error('Error generating title:', err);
      }
    },
    [currentConversation]
  );

  const newChat = useCallback(() => {
    setCurrentConversation(null);
    setError(null);
  }, []);

  useEffect(() => {
    const loadConversations = async () => {
      const data = await fetchConversations();
      const preferences = await api.getPreferences();
      if (preferences?.last_conversation_id && data?.length > 0) {
        const lastConversation = data.find((c) => c.id === preferences.last_conversation_id);
        if (lastConversation) {
          setCurrentConversation(lastConversation);
        }
      }
    };
    loadConversations();
  }, [fetchConversations]);

  return {
    conversations,
    currentConversation,
    setCurrentConversation,
    isLoading,
    error,
    setError,
    fetchConversations,
    createConversation,
    deleteConversation,
    selectConversation,
    generateTitle,
    newChat,
  };
}
