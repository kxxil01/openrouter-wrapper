import { useState, useRef, useEffect } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

function ChatInterface({ messages, onSendMessage, isLoading, error }) {
  const messagesEndRef = useRef(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-16 h-16 rounded-full bg-claude-light flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-claude-primary" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">How can I help you today?</h2>
          <p className="text-gray-600 text-center max-w-md mb-8">
            I'm Claude Opus 4, an AI assistant. Ask me anything, from creative writing to complex problem-solving.
          </p>
          <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
            {[
              "Explain quantum computing in simple terms",
              "Write a short story about a robot learning to paint",
              "Help me debug this JavaScript code",
              "Create a meal plan for the week"
            ].map((suggestion, index) => (
              <button
                key={index}
                className="p-4 bg-white border border-gray-200 rounded-lg text-left hover:bg-claude-light transition-colors"
                onClick={() => onSendMessage(suggestion)}
              >
                <p className="text-sm font-medium">{suggestion}</p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <MessageList messages={messages} />
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}
      
      {error && (
        <div className="p-2 bg-red-100 border-t border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}
      
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto">
          <MessageInput onSendMessage={onSendMessage} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}

export default ChatInterface;
