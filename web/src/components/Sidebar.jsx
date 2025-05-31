import { useState } from 'react';

function Sidebar({ 
  conversations, 
  currentConversationId,
  onSelectConversation, 
  onNewChat,
  onDeleteConversation,
  isLoading,
  isOpen,
  onToggle
}) {
  return (
    <aside className={`${isOpen ? 'w-64' : 'w-0'} bg-[#1e1e1e] border-r border-[#2a2a2a] flex flex-col h-full transition-all duration-300 overflow-hidden`}>
      <div className="p-2 flex flex-col">
        <div className="flex items-center justify-between mb-1 px-2 py-1">
          <button 
            onClick={onNewChat}
            className="flex items-center gap-2 text-sm text-white hover:text-gray-300 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New chat
          </button>
          <button
            onClick={onToggle}
            className="p-1 text-gray-400 hover:text-white rounded-md hover:bg-[#2a2a2a] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <h2 className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2 px-2">
          Conversations
        </h2>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-gray-300"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">
            No conversations yet
          </div>
        ) : (
          <ul className="space-y-1">
            {conversations.map((conversation) => (
              <li key={conversation.id}>
                <div 
                  className={`flex items-center justify-between p-2 rounded-md cursor-pointer ${
                    currentConversationId === conversation.id ? 'bg-[#2a2a2a] text-white' : 'hover:bg-[#252525] text-gray-300'
                  }`}
                  onClick={() => onSelectConversation(conversation.id)}
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                    </svg>
                    <span className="truncate text-sm">{conversation.title}</span>
                  </div>
                  
                  <div className="flex space-x-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(conversation.id);
                      }}
                      className="p-1 text-gray-500 hover:text-red-400 rounded"
                      aria-label="Delete conversation"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      <div className="p-4 border-t border-[#2a2a2a]">
        <div className="flex items-center text-sm text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span>Claude AI Chat</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
