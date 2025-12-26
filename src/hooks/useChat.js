import { useState, useRef, useCallback } from 'react';
import { v7 as uuidv7 } from 'uuid';
import * as api from '../lib/api';

export function useChat({
  currentConversation,
  setCurrentConversation,
  messages,
  setMessages,
  selectedModel,
  fetchConversations,
  generateTitle,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPaywall, setShowPaywall] = useState(false);

  const streamingContentRef = useRef('');
  const streamingUpdateTimeoutRef = useRef(null);

  const clearError = useCallback(() => setError(null), []);

  const flushStreamingUpdate = useCallback(() => {
    const currentContent = streamingContentRef.current;
    setMessages((prevMessages) => {
      const updated = [...prevMessages];
      const idx = updated.findIndex((m) => m.role === 'assistant' && m.isStreaming);
      if (idx !== -1) {
        updated[idx] = { ...updated[idx], content: currentContent };
      }
      return updated;
    });
  }, [setMessages]);

  const handleStreamChunk = useCallback(
    (chunkContent, useRAF = true) => {
      if (chunkContent) {
        streamingContentRef.current += chunkContent;
        if (!streamingUpdateTimeoutRef.current) {
          if (useRAF) {
            streamingUpdateTimeoutRef.current = requestAnimationFrame(() => {
              flushStreamingUpdate();
              streamingUpdateTimeoutRef.current = null;
            });
          } else {
            streamingUpdateTimeoutRef.current = setTimeout(() => {
              flushStreamingUpdate();
              streamingUpdateTimeoutRef.current = null;
            }, 50);
          }
        }
      }
    },
    [flushStreamingUpdate]
  );

  const clearStreamingTimeout = useCallback((useRAF = true) => {
    if (streamingUpdateTimeoutRef.current) {
      if (useRAF) {
        cancelAnimationFrame(streamingUpdateTimeoutRef.current);
      } else {
        clearTimeout(streamingUpdateTimeoutRef.current);
      }
      streamingUpdateTimeoutRef.current = null;
    }
  }, []);

  const sendMessage = useCallback(
    async (content, images = []) => {
      if (!content.trim() && images.length === 0) return;
      setError(null);
      setIsLoading(true);

      try {
        let conversationId = currentConversation?.id;
        let isNewConversation = false;
        let localMessages = [...messages];

        if (!conversationId) {
          const newConversation = await api.createConversation(
            'New Conversation',
            selectedModel.id
          );
          conversationId = newConversation.id;
          isNewConversation = true;
          setCurrentConversation(newConversation);

          const userMessage = {
            id: uuidv7(),
            role: 'user',
            content,
            images: images.length > 0 ? images : undefined,
            conversation_id: conversationId,
            created_at: new Date().toISOString(),
          };
          setMessages([userMessage]);
          localMessages = [userMessage];

          const savedMessage = await api.saveMessage(conversationId, 'user', content, images);
          setMessages([savedMessage]);
          localMessages = [savedMessage];
          await fetchConversations();
        } else {
          const savedMessage = await api.saveMessage(conversationId, 'user', content, images);
          localMessages = [...localMessages, savedMessage];
          setMessages(localMessages);
        }

        const apiMessages = localMessages.map((msg) => {
          if (msg.images && msg.images.length > 0) {
            return {
              role: msg.role,
              content: [
                { type: 'text', text: msg.content || '' },
                ...msg.images.map((img) => ({
                  type: 'image_url',
                  image_url: { url: img.data },
                })),
              ],
            };
          }
          return { role: msg.role, content: msg.content };
        });

        setMessages([...localMessages, { role: 'assistant', content: '', isStreaming: true }]);
        streamingContentRef.current = '';

        await api.sendMessageToClaudeAPI(
          selectedModel.id,
          apiMessages,
          true,
          conversationId,
          (chunk) => handleStreamChunk(chunk, true),
          async (streamError) => {
            clearStreamingTimeout(true);
            console.error('Stream error:', streamError);
            if (streamError?.message?.includes('Subscription required')) {
              if (conversationId) {
                const lastUserMsg = localMessages[localMessages.length - 1];
                if (lastUserMsg?.role === 'user') {
                  await api.deleteMessagesAfter(conversationId, localMessages.length - 1);
                }
              }
              setMessages(localMessages.slice(0, -1));
              setShowPaywall(true);
            } else {
              setError(streamError?.message || 'Failed to stream response');
            }
            setIsLoading(false);
          },
          async (finalContent) => {
            clearStreamingTimeout(true);
            const completeContent = finalContent || streamingContentRef.current;

            if (isNewConversation) {
              try {
                await generateTitle(conversationId);
              } catch (titleErr) {
                console.error('Failed to generate title:', titleErr);
              }

              const fetchedMessages = await api.getMessagesForConversation(conversationId);
              if (fetchedMessages && fetchedMessages.length > 0) {
                setMessages(fetchedMessages);
                setIsLoading(false);
                return;
              }
            }

            setMessages((prevMessages) => {
              const updated = [...prevMessages];
              const idx = updated.findIndex((m) => m.role === 'assistant' && m.isStreaming);
              if (idx !== -1) {
                if (completeContent && completeContent.trim().length > 0) {
                  updated[idx] = {
                    role: 'assistant',
                    content: completeContent,
                    conversation_id: conversationId,
                    created_at: new Date().toISOString(),
                  };
                } else {
                  updated[idx] = {
                    role: 'system',
                    content: 'Error: Failed to get a response. Please try again.',
                    isError: true,
                  };
                }
              }
              return updated;
            });

            setIsLoading(false);
          }
        );
      } catch (err) {
        console.error('Error sending message:', err);
        setError(err?.message || 'Failed to send message');
        setIsLoading(false);
      }
    },
    [
      currentConversation,
      messages,
      selectedModel,
      setCurrentConversation,
      setMessages,
      fetchConversations,
      generateTitle,
      handleStreamChunk,
      clearStreamingTimeout,
    ]
  );

  const editMessage = useCallback(
    async (messageIndex, newContent) => {
      if (!currentConversation?.id) return;
      setError(null);
      setIsLoading(true);

      try {
        await api.deleteMessagesAfter(currentConversation.id, messageIndex);
        const updatedMessages = messages.slice(0, messageIndex);
        setMessages(updatedMessages);

        const savedMessage = await api.saveMessage(currentConversation.id, 'user', newContent);
        const messagesWithNew = [...updatedMessages, savedMessage];
        setMessages(messagesWithNew);

        const apiMessages = messagesWithNew.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

        setMessages([...messagesWithNew, { role: 'assistant', content: '', isStreaming: true }]);
        streamingContentRef.current = '';

        await api.sendMessageToClaudeAPI(
          selectedModel.id,
          apiMessages,
          true,
          currentConversation.id,
          (chunk) => handleStreamChunk(chunk, false),
          (err) => {
            console.error('Streaming error:', err);
            setMessages((prev) => prev.filter((m) => !m.isStreaming));
            if (err?.message?.includes('Subscription required')) {
              setShowPaywall(true);
            } else {
              setError('Failed to get response');
            }
            setIsLoading(false);
          },
          async (fullContent) => {
            clearStreamingTimeout(false);
            const savedAssistant = await api.saveMessage(
              currentConversation.id,
              'assistant',
              fullContent
            );
            setMessages((prev) => {
              const updated = prev.filter((m) => !m.isStreaming);
              return [...updated, savedAssistant];
            });
            setIsLoading(false);
          }
        );
      } catch (err) {
        console.error('Error editing message:', err);
        setError('Failed to edit message');
        setIsLoading(false);
      }
    },
    [
      currentConversation,
      messages,
      selectedModel,
      setMessages,
      handleStreamChunk,
      clearStreamingTimeout,
    ]
  );

  const regenerateResponse = useCallback(
    async (messageIndex) => {
      if (!currentConversation || isLoading) return;

      const lastAssistantMessage = messages[messageIndex];
      if (!lastAssistantMessage || lastAssistantMessage.role !== 'assistant') return;

      setError(null);
      setIsLoading(true);

      try {
        await api.deleteMessagesAfter(currentConversation.id, messageIndex);

        const messagesWithoutLast = messages.slice(0, messageIndex);
        setMessages(messagesWithoutLast);

        const apiMessages = messagesWithoutLast.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        streamingContentRef.current = '';
        setMessages((prev) => [...prev, { role: 'assistant', content: '', isStreaming: true }]);

        await api.sendMessageToClaudeAPI(
          selectedModel.id,
          apiMessages,
          true,
          currentConversation.id,
          (chunk) => handleStreamChunk(chunk, false),
          (err) => {
            console.error('Regenerate error:', err);
            setMessages((prev) => prev.filter((m) => !m.isStreaming));
            if (err?.message?.includes('Subscription required')) {
              setShowPaywall(true);
            } else {
              setError('Failed to regenerate response');
            }
            setIsLoading(false);
          },
          async (fullContent) => {
            clearStreamingTimeout(false);
            setMessages((prev) => {
              const updated = prev.filter((m) => !m.isStreaming);
              return [...updated, { role: 'assistant', content: fullContent }];
            });
            setIsLoading(false);
          },
          0.9
        );
      } catch (err) {
        console.error('Error regenerating response:', err);
        setError('Failed to regenerate response');
        setIsLoading(false);
      }
    },
    [
      currentConversation,
      messages,
      selectedModel,
      isLoading,
      setMessages,
      handleStreamChunk,
      clearStreamingTimeout,
    ]
  );

  return {
    isLoading,
    error,
    showPaywall,
    setShowPaywall,
    clearError,
    sendMessage,
    editMessage,
    regenerateResponse,
  };
}
