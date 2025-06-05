import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ChatInterface from './components/ChatInterface';
import Sidebar from './components/Sidebar';
import * as api from './lib/api';

// Define available Claude models - only stable versions with distinct names
const CLAUDE_MODELS = [
  { id: 'anthropic/claude-opus-4', name: 'Claude Opus 4' },
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4' },
  { id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet' },
];

function App() {
  // UI state
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Model selection
  const [selectedModel, setSelectedModel] = useState(CLAUDE_MODELS[0]);
  const [availableModels, setAvailableModels] = useState(CLAUDE_MODELS);
  
  // Conversation state
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  
  // Messages state
  const [messages, setMessages] = useState([]);

  // Fetch available models
  const fetchModels = async () => {
    // Models are defined locally for now
    // In a production app, you might fetch these from an API
    setAvailableModels(CLAUDE_MODELS);
  };

  // Fetch conversations from backend API
  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching conversations from API...');
      
      const data = await api.getConversations();
      
      console.log('Fetched conversations:', data);
      setConversations(data || []);
      
      // Set current conversation to the most recent one if none is selected
      if (!currentConversation && data && data.length > 0) {
        setCurrentConversation(data[0]);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setError('Failed to load conversations: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch messages for a conversation from backend API
  const fetchMessages = async (conversationId) => {
    try {
      setIsLoading(true);
      console.log(`Fetching messages for conversation: ${conversationId}`);
      
      const data = await api.getMessagesForConversation(conversationId);
      console.log(`Received ${data ? data.length : 0} messages for conversation`);
      
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('Failed to load messages: ' + (error.message || 'Unknown error'));
      // Set empty messages array to prevent UI from breaking
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new conversation via backend API
  const createNewConversation = async (title, modelId) => {
    try {
      setIsLoading(true);
      
      const data = await api.createConversation(title, modelId);
      
      setConversations([data, ...conversations]);
      setCurrentConversation(data);
      setMessages([]);
      
      return data;
    } catch (error) {
      console.error('Error creating conversation:', error);
      setError('Failed to create conversation: ' + error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a conversation via backend API
  const handleDeleteConversation = async (conversationId) => {
    try {
      setIsLoading(true);
      
      // Delete the conversation (messages will be deleted via CASCADE)
      await api.deleteConversation(conversationId);
      
      // Update local state
      const updatedConversations = conversations.filter(conv => conv.id !== conversationId);
      setConversations(updatedConversations);
      
      // If the deleted conversation was the current one, select a new one or clear current conversation
      if (currentConversation && currentConversation.id === conversationId) {
        if (updatedConversations.length > 0) {
          setCurrentConversation(updatedConversations[0]);
        } else {
          // Explicitly set to null to trigger new conversation creation on next message
          setCurrentConversation(null);
          setMessages([]);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      setError('Failed to delete conversation: ' + error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Save a message via backend API
  const saveMessageToDb = async (role, content) => {
    if (!currentConversation) return null;
    
    try {
      const data = await api.saveMessage(currentConversation.id, role, content);
      
      // Update the local messages state
      setMessages([...messages, data]);
      
      return data;
    } catch (error) {
      console.error('Error saving message:', error);
      setError('Failed to save message: ' + error.message);
      throw error;
    }
  };

  // Handle selecting a model
  const handleModelSelect = (model) => {
    setSelectedModel(model);
  };

  // Handle starting a new chat
  const handleNewChat = () => {
    setCurrentConversation(null);
    setMessages([]);
    setError(null);
  };

  // Handle selecting an existing conversation
  const handleSelectConversation = async (conversationId) => {
    try {
      // Find the conversation in our list
      const conversation = conversations.find(conv => conv.id === conversationId);
      if (!conversation) {
        console.error('Conversation not found:', conversationId);
        return;
      }
      
      setCurrentConversation(conversation);
      setError(null);
      
      // Fetch messages for this conversation
      await fetchMessages(conversationId);
    } catch (error) {
      console.error('Error selecting conversation:', error);
      setError('Failed to load conversation: ' + (error.message || 'Unknown error'));
    }
  };

  // Handle sending a message to Claude API via backend
  const handleSendMessage = async (content) => {
    if (!content.trim()) return;
    setError(null);
    setIsLoading(true);
    
    try {
      // Create a new conversation if none exists
      let conversationId = currentConversation?.id;
      let isNewConversation = false;
      let localMessages = [...messages]; // Create a local copy of messages
      
      if (!conversationId) {
        console.log('Creating new conversation...');
        // Create a new conversation with a default title that will be updated later
        const newConversation = await api.createConversation('New Conversation', selectedModel.id);
        conversationId = newConversation.id;
        isNewConversation = true;
        
        console.log('New conversation created:', newConversation);
        
        // Update state with the new conversation
        setCurrentConversation(newConversation);
        
        // Ensure the conversation is added to the conversations list
        setConversations(prevConversations => [newConversation, ...prevConversations]);
        
        // Create a user message object
        const userMessage = { 
          id: uuidv4(), // Generate a temporary ID
          role: 'user', 
          content, 
          conversation_id: conversationId,
          created_at: new Date().toISOString()
        };
        
        // Update UI immediately with the user message
        setMessages([userMessage]);
        localMessages = [userMessage];
        
        // Save user message to database with the new conversation ID
        console.log('Saving message to new conversation:', conversationId);
        const savedMessage = await api.saveMessage(conversationId, 'user', content);
        console.log('Message saved:', savedMessage);
        
        // Replace the temporary message with the saved one
        setMessages([savedMessage]);
        localMessages = [savedMessage];
        
        // Ensure conversations list is refreshed
        await fetchConversations();
      } else {
        // For existing conversations, save message normally
        const savedMessage = await api.saveMessage(conversationId, 'user', content);
        localMessages = [...localMessages, savedMessage];
        setMessages(localMessages);
      }
      
      // Format messages for Claude API - use localMessages instead of state messages
      const apiMessages = localMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Add the new user message if it's not already in the messages array
      // This check was causing the issue with streaming in new conversations
      // because for new conversations, we're not correctly checking if the user message is already included
      const lastMessage = apiMessages[apiMessages.length - 1];
      const isUserMessageAlreadyIncluded = lastMessage && lastMessage.role === 'user' && lastMessage.content === content;
      
      if (!isUserMessageAlreadyIncluded) {
        apiMessages.push({
          role: 'user',
          content
        });
      }
      
      console.log('Sending message to Claude API...', apiMessages);
      
      try {
        // Define responseData at the top level so it's available in all code paths
        let responseData = null;
        
        // Enable streaming for better user experience
        const useStreaming = true;
        
        if (useStreaming) {
          // Add a placeholder message for the assistant's response that will be updated
          const placeholderMessage = { role: 'assistant', content: '', isStreaming: true };
          setMessages([...localMessages, placeholderMessage]);
          
          // Track streamed content outside the callbacks for final processing
          let streamedContent = '';
          let streamController = null;
          let streamError = null;
          
          try {
            // Call the Claude API with streaming enabled and pass the conversation ID
            // Use the enhanced API with callbacks for better stream handling
            console.log('Starting streaming request with', apiMessages.length, 'messages');
            streamController = await api.sendMessageToClaudeAPI(
              selectedModel.id, 
              apiMessages, 
              true, 
              conversationId,
              // onStreamChunk callback
              (chunkContent) => {
                if (chunkContent) {
                  // Accumulate the content
                  streamedContent += chunkContent;
                  
                  // Update the messages array with the new content
                  setMessages(prevMessages => {
                    const updatedMessages = [...prevMessages];
                    const assistantMessageIndex = updatedMessages.findIndex(
                      msg => msg.role === 'assistant' && msg.isStreaming
                    );
                    
                    if (assistantMessageIndex !== -1) {
                      updatedMessages[assistantMessageIndex] = {
                        ...updatedMessages[assistantMessageIndex],
                        content: streamedContent
                      };
                    } else {
                      // If we somehow don't have a streaming message placeholder,
                      // add one now to ensure we show the streaming content
                      updatedMessages.push({
                        role: 'assistant',
                        content: streamedContent,
                        isStreaming: true
                      });
                    }
                    
                    return updatedMessages;
                  });
                }
              },
              // onStreamError callback
              (error) => {
                // Safely log the error
                console.error('Stream error:', error ? error : 'Unknown error');
                streamError = error || new Error('Unknown streaming error');
                
                // Get a safe error message
                const errorMessage = error && typeof error === 'object' ? 
                  (error.message || 'Failed to stream response from Claude') : 
                  (typeof error === 'string' ? error : 'Failed to stream response from Claude');
                
                // Update the UI with the error
                setMessages(prevMessages => {
                  const updatedMessages = [...prevMessages];
                  const assistantMessageIndex = updatedMessages.findIndex(
                    msg => msg.role === 'assistant' && msg.isStreaming
                  );
                  
                  if (assistantMessageIndex !== -1) {
                    updatedMessages[assistantMessageIndex] = {
                      role: 'system',
                      content: `Error: ${errorMessage}`,
                      isError: true
                    };
                  }
                  
                  return updatedMessages;
                });
              },
              // onStreamComplete callback - now receives the final content from the API client
              async (finalContent) => {
                console.log('Stream completed with final content length:', finalContent ? finalContent.length : 0);
                
                // Use the finalContent from the API if available, otherwise use our accumulated content
                const completeContent = finalContent || streamedContent;
                
                try {
                  // For new conversations, we need to refresh the conversation list to get the updated conversation
                  if (isNewConversation) {
                    console.log('Refreshing conversations after stream completion for new conversation');
                    await fetchConversations();
                    
                    // Also fetch the messages for this conversation to ensure we have the latest state
                    const fetchedMessages = await api.getMessagesForConversation(conversationId);
                    console.log('Fetched messages after stream completion:', fetchedMessages);
                    
                    // If we have fetched messages, use them instead of our local state
                    if (fetchedMessages && fetchedMessages.length > 0) {
                      setMessages(fetchedMessages);
                      console.log('Updated messages from database after stream completion');
                      setIsLoading(false);
                      return; // Exit early since we've updated messages from the database
                    }
                  }
                  
                  // Update the final message to remove the streaming flag
                  setMessages(prevMessages => {
                    const updatedMessages = [...prevMessages];
                    const assistantMessageIndex = updatedMessages.findIndex(
                      msg => msg.role === 'assistant' && msg.isStreaming
                    );
                    
                    if (assistantMessageIndex !== -1) {
                      // If we got some content, show it as a successful response
                      if (completeContent && completeContent.trim().length > 0) {
                        updatedMessages[assistantMessageIndex] = {
                          role: 'assistant',
                          content: completeContent,
                          conversation_id: conversationId,
                          created_at: new Date().toISOString()
                        };
                      } else if (!streamError) {
                        // If we didn't get any content and there's no error, show a generic error
                        updatedMessages[assistantMessageIndex] = {
                          role: 'system',
                          content: 'Error: Failed to get a complete response from Claude. Please try again.',
                          isError: true
                        };
                      }
                      // If there was an error, it's already been handled by the onStreamError callback
                    }
                    
                    return updatedMessages;
                  });
                  
                  console.log('UI updated with complete response');
                } catch (error) {
                  console.error('Error handling stream completion:', error);
                  setError('Error handling response: ' + error.message);
                } finally {
                  // Always ensure loading state is reset
                  setIsLoading(false);
                }
              }
            );
            
            // Wait for streaming to complete
            // This is handled by the callbacks, so we don't need to do anything here
          } catch (streamingError) {
            // Safely log the error
            console.error('Error setting up streaming:', streamingError ? streamingError : 'Unknown error');
            
            // Get a safe error message
            const errorMessage = streamingError && typeof streamingError === 'object' ? 
              (streamingError.message || 'Failed to set up streaming') : 
              (typeof streamingError === 'string' ? streamingError : 'Failed to set up streaming');
            
            // Update the UI with the error
            setMessages(prevMessages => {
              const updatedMessages = [...prevMessages];
              const assistantMessageIndex = updatedMessages.findIndex(
                msg => msg.role === 'assistant' && msg.isStreaming
              );
              
              if (assistantMessageIndex !== -1) {
                updatedMessages[assistantMessageIndex] = {
                  role: 'system',
                  content: `Error: ${errorMessage}`,
                  isError: true
                };
              }
              
              return updatedMessages;
            });
            
            // Create a safe error to throw
            const safeError = streamingError || new Error('Unknown streaming error');
            throw safeError;
          }
          
          // Note: We don't need to save the assistant's response to the database here
          // because the backend is handling that for us in the onComplete callback
        } else {
          try {
            // Non-streaming fallback
            console.log('Using non-streaming API call');
            const responseData = await api.sendMessageToClaudeAPI(selectedModel.id, apiMessages, false, conversationId);
            
            if (!responseData || !responseData.choices || !responseData.choices[0] || !responseData.choices[0].message) {
              console.error('Invalid response format from Claude API:', responseData);
              throw new Error('Received invalid response format from Claude API');
            }
            
            // Save the assistant's response
            const assistantContent = responseData.choices[0].message.content;
            
            // For new conversations, refresh the conversation list to ensure we have the latest state
            if (isNewConversation) {
              console.log('Refreshing conversations after non-streaming completion for new conversation');
              await fetchConversations();
              
              // Also fetch the messages for this conversation to ensure we have the latest state
              const fetchedMessages = await api.getMessagesForConversation(conversationId);
              console.log('Fetched messages after non-streaming completion:', fetchedMessages);
              
              if (fetchedMessages && fetchedMessages.length > 0) {
                setMessages(fetchedMessages);
                console.log('Updated messages from database after non-streaming completion');
              } else {
                // If we couldn't fetch messages, save the assistant response locally
                await saveMessageToDb('assistant', assistantContent);
              }
            } else {
              // For existing conversations, just save the message
              await saveMessageToDb('assistant', assistantContent);
            }
          } catch (nonStreamingError) {
            console.error('Error in non-streaming path:', nonStreamingError);
            setError('Error getting response: ' + nonStreamingError.message);
            throw nonStreamingError;
          }
        }
        
        // Update the conversation title if it's a new conversation
        if (isNewConversation && conversationId) {
          const firstMessageContent = content.substring(0, 30) + (content.length > 30 ? '...' : '');
          
          try {
            const updatedConversation = await api.updateConversation(conversationId, { 
              title: firstMessageContent 
            });
            
            // Update the local state if the update was successful
            if (updatedConversation) {
              setCurrentConversation(updatedConversation);
              setConversations(conversations.map(conv => 
                conv.id === conversationId ? updatedConversation : conv
              ));
            }
          } catch (titleUpdateError) {
            console.error('Error updating conversation title:', titleUpdateError);
            // Continue execution even if title update fails
          }
        }
        
        return responseData;
      } catch (apiError) {
        // Safely log the API error with details
        if (apiError && typeof apiError === 'object') {
          console.error('Claude API error:', {
            message: apiError.message || 'Unknown error',
            code: apiError.code || 'UNKNOWN',
            status: apiError.status || null,
            details: apiError.details || null
          });
        } else {
          console.error('Claude API error:', apiError || 'Unknown Claude API error');
        }
        
        // Format a user-friendly error message
        let errorMessage = 'Failed to get response from Claude';
        
        if (apiError.code === 'claude_not_configured') {
          errorMessage = 'Claude API is not configured. Please check your API key.';
        } else if (apiError.status === 429) {
          errorMessage = 'Rate limit exceeded. Please try again later.';
        } else if (apiError.message) {
          errorMessage = apiError.message;
        }
        
        setError(errorMessage);
        
        // Display the error in the UI instead of saving as a system message
        // Don't save system messages to the database as they violate the role constraint
        setMessages(prevMessages => [
          ...prevMessages,
          { role: 'system', content: `Error: ${errorMessage}`, isError: true }
        ]);
        
        throw apiError;
      }
    } catch (error) {
      // Safely log the message handling error with details
      if (error && typeof error === 'object') {
        console.error('Error in message handling flow:', {
          message: error.message || 'Unknown error',
          code: error.code || 'UNKNOWN',
          status: error.status || null,
          stack: error.stack || null
        });
      } else {
        console.error('Error in message handling flow:', error || 'Unknown message handling error');
      }
      setError('Error: ' + (error.message || 'Failed to process message'));
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load available models and conversations on component mount
  useEffect(() => {
    fetchModels();
    fetchConversations();
  }, []);

  // Fetch messages when current conversation changes
  useEffect(() => {
    if (currentConversation) {
      fetchMessages(currentConversation.id);
    } else {
      setMessages([]);
    }
  }, [currentConversation]);
  
  // Render the UI
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
      />
      <ChatInterface
        messages={messages}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        error={error}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
        selectedModel={selectedModel}
        availableModels={availableModels}
        onModelSelect={handleModelSelect}
      />
    </div>
  );
}

export default App;