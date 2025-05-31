import { useState, useRef, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import Sidebar from './components/Sidebar';

// Define available Claude models - only stable versions with distinct names
const CLAUDE_MODELS = [
  { id: 'anthropic/claude-opus-4', name: 'Claude Opus 4' },
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4' },
  { id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet' },
];

function App() {
  const [conversations, setConversations] = useState([
    { id: 'default', name: 'New conversation', messages: [] }
  ]);
  const [activeConversation, setActiveConversation] = useState('default');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedModel, setSelectedModel] = useState(CLAUDE_MODELS[0]);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  
  // Get the active conversation object
  const currentConversation = conversations.find(c => c.id === activeConversation) || conversations[0];

  // Create a new conversation
  const createNewConversation = () => {
    const newId = `conv-${Date.now()}`;
    const newConversation = {
      id: newId,
      name: 'New conversation',
      messages: []
    };
    
    setConversations([...conversations, newConversation]);
    setActiveConversation(newId);
  };

  // Delete a conversation
  const deleteConversation = (id) => {
    const updatedConversations = conversations.filter(c => c.id !== id);
    
    // If we're deleting the active conversation, switch to another one
    if (id === activeConversation && updatedConversations.length > 0) {
      setActiveConversation(updatedConversations[0].id);
    }
    
    setConversations(updatedConversations);
  };

  // Rename a conversation
  const renameConversation = (id, newName) => {
    setConversations(conversations.map(c => 
      c.id === id ? { ...c, name: newName } : c
    ));
  };

  // Add a message to the current conversation
  const addMessage = (message) => {
    // Use functional update to ensure we're working with the latest state
    setConversations(prevConversations => {
      // Find the current conversation
      const currentConv = prevConversations.find(c => c.id === activeConversation);
      
      if (!currentConv) return prevConversations;
      
      // Create a new name if this is the first user message
      const newName = currentConv.messages.length === 0 && message.role === 'user'
        ? message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '')
        : currentConv.name;
      
      // Log for debugging
      console.log(`Adding message: ${message.role} - ${message.content.substring(0, 20)}...`);
      console.log(`Current messages count: ${currentConv.messages.length}`);
      
      // Update the conversation with the new message
      return prevConversations.map(c => 
        c.id === activeConversation 
          ? { 
              ...c, 
              messages: [...c.messages, message],
              name: newName
            } 
          : c
      );
    });
  };

  // Send a message to Claude with streaming response
  const sendMessage = async (content) => {
    if (!content.trim()) return;
    
    // Create a new user message
    const userMessage = { 
      role: 'user', 
      content, 
      timestamp: new Date().toISOString() 
    };
    addMessage(userMessage);
    
    // Create a placeholder for the assistant's response
    const assistantPlaceholder = { 
      role: 'assistant', 
      content: '', 
      timestamp: new Date().toISOString(),
      isStreaming: true 
    };
    addMessage(assistantPlaceholder);
    
    setIsLoading(true);
    setError(null);
    
    let streamContent = '';
    let lastUpdateTime = Date.now();
    const updateInterval = 33; // ~30fps for smoother visual updates
    let animationFrameId = null;
    
    try {
      console.log('Setting up streaming connection');
      
      // Prepare messages for the API request
      const messagesToSend = [...currentConversation.messages.filter(m => !m.isStreaming), userMessage]
        .map(({ role, content }) => ({ role, content }));
      
      console.log('Sending streaming request with messages:', messagesToSend.length);
      
      // Use AbortController to be able to cancel the fetch request if needed
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      const response = await fetch('/api/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({ 
          messages: messagesToSend,
          model: selectedModel.id,
          stream: true
        }),
        signal: controller.signal
      });
      
      // Clear the timeout since we got a response
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      if (!response.body) {
        throw new Error('ReadableStream not supported in this browser');
      }
      
      console.log('Stream response received, setting up reader');
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let pendingUpdate = false;
      
      // Function to update UI with optimized throttling and frame synchronization
      const updateUI = (content) => {
        const now = Date.now();
        
        // Cancel any pending animation frame to avoid redundant updates
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
        
        // Force immediate update if it's been too long since last update
        const timeSinceLastUpdate = now - lastUpdateTime;
        const forceUpdate = timeSinceLastUpdate >= 100; // Force update if more than 100ms passed
        
        if (forceUpdate || timeSinceLastUpdate >= updateInterval || !pendingUpdate) {
          pendingUpdate = false;
          lastUpdateTime = now;
          
          // Use requestAnimationFrame to sync with browser's rendering cycle
          animationFrameId = requestAnimationFrame(() => {
            // Use functional state update to ensure we're working with latest state
            setConversations(prevConversations => {
              // Find current conversation first
              const currentConv = prevConversations.find(c => c.id === activeConversation);
              if (!currentConv) return prevConversations;
              
              // Only update if content has actually changed and is not empty
              const streamingMsg = currentConv.messages.find(msg => msg.isStreaming);
              if (streamingMsg && streamingMsg.content === content) {
                return prevConversations; // No change needed
              }
              
              // Update the conversation with new content
              return prevConversations.map(c => 
                c.id === activeConversation 
                  ? { 
                      ...c, 
                      messages: c.messages.map(msg => 
                        msg.isStreaming 
                          ? { ...msg, content }
                          : msg
                      )
                    } 
                  : c
              );
            });
            
            animationFrameId = null;
          });
        } else if (!pendingUpdate) {
          pendingUpdate = true;
          setTimeout(() => updateUI(content), Math.min(updateInterval - timeSinceLastUpdate, 50));
        }
      };
      
      // Process the stream
      while (true) {
        const { value, done } = await reader.read();
        
        if (done) {
          console.log('Stream complete');
          // Finalize the message when the stream is done
          setConversations(prevConversations => 
            prevConversations.map(c => 
              c.id === activeConversation 
                ? { 
                    ...c, 
                    messages: c.messages.map(msg => 
                      msg.isStreaming 
                        ? { ...msg, content: streamContent, isStreaming: false }
                        : msg
                    )
                  } 
                : c
            )
          );
          setIsLoading(false);
          break;
        }
        
        // Decode the chunk and add to buffer
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        // Process complete SSE messages
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep the last incomplete chunk in the buffer
        
        let contentUpdated = false;
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const dataStr = line.slice(6).trim();
              if (!dataStr) continue;
              
              // Reduce console logging to improve performance
              if (Math.random() < 0.1) { // Only log ~10% of messages
                console.log('Received SSE data:', dataStr.substring(0, 50) + (dataStr.length > 50 ? '...' : ''));
              }
              
              const data = JSON.parse(dataStr);
              
              // Handle different message types
              if (data.type === 'content' && data.content) {
                // Add the new content to our stream
                streamContent += data.content;
                contentUpdated = true;
                
                // Force immediate UI update for better responsiveness
                if (streamContent.length % 50 === 0) { // Update every ~50 chars
                  updateUI(streamContent);
                }
              } else if (data.type === 'error') {
                console.error('Streaming error:', data.details);
                setError(data.details || 'An error occurred during streaming');
                reader.cancel();
                
                // Update the message to show the error
                setConversations(prevConversations => 
                  prevConversations.map(c => 
                    c.id === activeConversation 
                      ? { 
                          ...c, 
                          messages: c.messages.map(msg => 
                            msg.isStreaming 
                              ? { ...msg, content: `Error: ${data.details || 'Something went wrong'}`, isStreaming: false }
                              : msg
                          )
                        } 
                      : c
                  )
                );
                setIsLoading(false);
                break;
              } else if (data.type === 'connected') {
                console.log('SSE connection established, request ID:', data.requestId);
              } else if (data.type === 'done') {
                console.log('SSE stream completed');
              }
            } catch (error) {
              console.error('Error parsing SSE data:', error, '\nRaw line:', line);
            }
          }
        }
        
        // Only update UI if content has changed and is not empty
        if (contentUpdated && streamContent.trim() !== '') {
          updateUI(streamContent);
        }
      }
    } catch (error) {
      console.error('Error in streaming request:', error);
      setError(error.message || 'An error occurred');
      setIsLoading(false);
      
      // Update the assistant message to indicate the error
      setConversations(prevConversations => 
        prevConversations.map(c => 
          c.id === activeConversation 
            ? { 
                ...c, 
                messages: c.messages.map(msg => 
                  msg.isStreaming 
                    ? { ...msg, content: `Error: ${error.message || 'An error occurred'}`, isStreaming: false }
                    : msg
                )
              } 
            : c
        )
      );
    }
  };

  return (
    <div className="flex h-screen bg-[#171717] text-dark-text overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        conversations={conversations} 
        activeConversationId={activeConversation} 
        onSelectConversation={setActiveConversation}
        onNewConversation={createNewConversation}
        onDeleteConversation={deleteConversation}
        onEditConversationTitle={renameConversation}
        isOpen={isSidebarOpen}
        onToggle={() => setSidebarOpen(!isSidebarOpen)}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full">
        {/* Hamburger menu when sidebar is collapsed */}
        {!isSidebarOpen && (
          <div className="absolute top-3 left-3 z-10">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-dark-muted hover:text-dark-text rounded-md hover:bg-dark-hover transition-colors"
              aria-label="Open sidebar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        )}
        
        {/* Centered container */}
        <div className="flex-1 flex justify-center">
          <div className={`${!isSidebarOpen ? 'max-w-3xl mx-auto px-4' : 'w-full'}`} style={{ width: !isSidebarOpen ? '100%' : 'auto' }}>
            <ChatInterface 
              messages={currentConversation.messages}
              onSendMessage={sendMessage}
              isLoading={isLoading}
              error={error}
              models={CLAUDE_MODELS}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              isSidebarOpen={isSidebarOpen}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
