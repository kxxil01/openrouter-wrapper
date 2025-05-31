import { useState, useRef, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import Sidebar from './components/Sidebar';

function App() {
  const [conversations, setConversations] = useState([
    { id: 'default', name: 'New conversation', messages: [] }
  ]);
  const [activeConversation, setActiveConversation] = useState('default');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
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
    setConversations(conversations.map(c => 
      c.id === activeConversation 
        ? { 
            ...c, 
            messages: [...c.messages, message],
            // If this is the first user message, use it to name the conversation
            name: c.messages.length === 0 && message.role === 'user' 
              ? message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '')
              : c.name
          } 
        : c
    ));
  };

  // Send a message to Claude with streaming response
  const sendMessage = async (content) => {
    if (!content.trim()) return;
    
    // Add user message to the conversation
    const userMessage = { role: 'user', content, timestamp: new Date().toISOString() };
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
    
    let eventSource = null;
    let streamContent = '';
    
    try {
      // First send the message data - IMPORTANT: Do this BEFORE creating the EventSource
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...currentConversation.messages.filter(m => !m.isStreaming), userMessage]
            .map(({ role, content }) => ({ role, content })),
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      console.log('POST request successful, establishing SSE connection...');
      
      // Now create the EventSource to receive the streaming response
      eventSource = new EventSource(`/api/chat/stream?${new URLSearchParams({
        timestamp: Date.now(), // Prevent caching
        requestId: userMessage.timestamp // Link this stream to the specific request
      })}`);
      
      // Function to update the streaming message content
      const updateStreamingMessage = (content) => {
        setConversations(conversations.map(c => 
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
        ));
      };
      
      // Function to finalize the streaming message
      const finishStreaming = () => {
        setConversations(conversations.map(c => 
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
        ));
        
        if (eventSource) {
          eventSource.close();
        }
        setIsLoading(false);
      };
      
      // Handle incoming message events
      eventSource.onmessage = (event) => {
        try {
          console.log('Received SSE event:', event.data.substring(0, 100));
          const data = JSON.parse(event.data);
          
          // Handle different response formats
          if (data.type === 'content') {
            // Standard format from our server
            streamContent += data.content;
          } else if (data.choices && data.choices[0]) {
            if (data.choices[0].delta && data.choices[0].delta.content) {
              // OpenAI-style delta format
              streamContent += data.choices[0].delta.content;
            } else if (data.choices[0].message && data.choices[0].message.content) {
              // Direct content format
              streamContent += data.choices[0].message.content;
            } else if (data.choices[0].text) {
              // Some APIs use 'text' directly
              streamContent += data.choices[0].text;
            }
          } else if (data.content) {
            // Direct content format
            streamContent += data.content;
          } else if (typeof data === 'string') {
            // Plain string content
            streamContent += data;
          } else if (data.type === 'finish' || data.type === 'done') {
            // Streaming is complete
            finishStreaming();
            return;
          } else if (data.type === 'error') {
            setError(data.details || 'An error occurred during streaming');
            eventSource.close();
            setIsLoading(false);
            return;
          }
          
          // Update the assistant message with the new content
          updateStreamingMessage(streamContent);
        } catch (error) {
          console.error('Error processing SSE message:', error, '\nRaw data:', event.data);
        }
      };
      
      // Handle completion event
      eventSource.addEventListener('done', () => {
        console.log('Received done event');
        finishStreaming();
      });
      
      // Handle errors
      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        setError('Connection error. Please try again.');
        if (eventSource) {
          eventSource.close();
        }
        setIsLoading(false);
        
        // Update the assistant message to indicate the error
        setConversations(conversations.map(c => 
          c.id === activeConversation 
            ? { 
                ...c, 
                messages: c.messages.map((msg) => 
                  msg.isStreaming 
                    ? { ...msg, content: 'Error: Connection lost. Please try again.', isStreaming: false }
                    : msg
                )
              } 
            : c
        ));
      };
    } catch (err) {
      console.error('Error sending message:', err);
      setError(`Failed to communicate with Claude: ${err.message}`);
      if (eventSource) {
        eventSource.close();
      }
      setIsLoading(false);
      
      // Update the assistant message to indicate the error
      setConversations(conversations.map(c => 
        c.id === activeConversation 
          ? { 
              ...c, 
              messages: c.messages.map((msg) => 
                msg.isStreaming 
                  ? { ...msg, content: `Error: ${err.message}`, isStreaming: false }
                  : msg
              )
            } 
          : c
      ));
    }
  };

  return (
    <div className="flex h-full">
      <Sidebar 
        conversations={conversations}
        activeConversation={activeConversation}
        onSelectConversation={setActiveConversation}
        onNewConversation={createNewConversation}
        onDeleteConversation={deleteConversation}
        onRenameConversation={renameConversation}
      />
      <main className="flex-1 flex flex-col h-full">
        <ChatInterface 
          messages={currentConversation.messages}
          onSendMessage={sendMessage}
          isLoading={isLoading}
          error={error}
        />
      </main>
    </div>
  );
}

export default App;
