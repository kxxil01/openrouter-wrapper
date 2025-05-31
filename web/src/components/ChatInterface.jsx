import { useState, useRef, useEffect } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ModelSelector from './ModelSelector';

function ChatInterface({ messages, onSendMessage, isLoading, error, isSidebarOpen, onToggleSidebar, selectedModel, availableModels, onModelSelect }) {
  const messagesEndRef = useRef(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full flex-1">
      <div className="flex items-center p-3 bg-[#1a1a1a] border-b border-[#2a2a2a]">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-gray-400 hover:text-white rounded-md hover:bg-[#2a2a2a] transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-lg font-medium text-white ml-2">Claude Chat</h1>
      </div>
      
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#171717]">
          <h2 className="text-3xl font-medium text-white mb-2">What can I help with?</h2>
          <p className="text-gray-400 text-center max-w-md">Ask me anything about coding, software development, or technical topics.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto bg-[#171717]">
          <div className="max-w-3xl mx-auto w-full">
            <MessageList messages={messages} />
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}
      
      {error && (
        <div className="p-2 bg-red-900 border-t border-red-800 text-red-100 text-sm">
          {error}
        </div>
      )}
      
      <div className="p-4 bg-[#171717]">
        <div className="max-w-3xl mx-auto w-full">
          <div className="flex flex-col">
            <div className="flex items-center justify-end mb-2">
              <ModelSelector 
                models={availableModels} 
                selectedModel={selectedModel} 
                onModelChange={onModelSelect} 
              />
            </div>
            <MessageInput onSendMessage={onSendMessage} isLoading={isLoading} />
            <div className="border-t-[1px] border-[#2a2a2a] mt-3 pt-3">
              <div className="text-xs text-gray-500 text-center">
                {selectedModel.name} may produce inaccurate information about people, places, or facts.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatInterface;
