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
    
    try {
      // Use the streaming endpoint
      const eventSource = new EventSource(`/api/chat/stream?${new URLSearchParams({
        timestamp: Date.now() // Prevent caching
      })}`);
      
      // Send the message data
      fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...currentConversation.messages.filter(m => !m.isStreaming), userMessage]
            .map(({ role, content }) => ({ role, content })),
        }),
      });
      
      let streamContent = '';
      
      // Handle incoming events
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'content') {
          // Append new content
          streamContent += data.content;
          
          // Update the assistant message with the new content
          setConversations(conversations.map(c => 
            c.id === activeConversation 
              ? { 
                  ...c, 
                  messages: c.messages.map((msg, i) => 
                    msg.isStreaming 
                      ? { ...msg, content: streamContent }
                      : msg
                  )
                } 
              : c
          ));
        } else if (data.type === 'finish' || data.type === 'done') {
          // Streaming is complete, finalize the message
          setConversations(conversations.map(c => 
            c.id === activeConversation 
              ? { 
                  ...c, 
                  messages: c.messages.map((msg, i) => 
                    msg.isStreaming 
                      ? { ...msg, content: streamContent, isStreaming: false }
                      : msg
                  )
                } 
              : c
          ));
          
          // Close the connection
          eventSource.close();
          setIsLoading(false);
        } else if (data.type === 'error') {
          setError(data.details || 'An error occurred during streaming');
          eventSource.close();
          setIsLoading(false);
        }
      };
      
      // Handle errors
      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        setError('Connection error. Please try again.');
        eventSource.close();
        setIsLoading(false);
      };
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to communicate with Claude. Please try again.');
      setIsLoading(false);
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
