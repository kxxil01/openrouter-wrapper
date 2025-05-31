import { useState, useRef, useEffect } from 'react';
import './MessageInput.css'; // We'll create this file next

function MessageInput({ onSendMessage, isLoading }) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);

  // Auto-resize textarea as content grows
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyDown = (e) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };



  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative rounded-xl bg-[#1e1e1e] border-[1px] border-[#2a2a2a] shadow-lg">
        <div className="flex items-center relative">
          {/* No left side button */}
          
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything"
            className="w-full resize-none border-0 bg-transparent py-3.5 pl-4 pr-16 focus:ring-0 focus:outline-none text-sm text-white placeholder-gray-400 rounded-xl min-h-[52px] max-h-[200px]"
            rows={1}
            disabled={isLoading}
          />
          
          {/* Right side buttons */}
          <div className="absolute right-2 flex items-center space-x-1">
            {/* No microphone button */}
            
            {/* Send button */}
            <button
              type="submit"
              disabled={!message.trim() || isLoading}
              className={`p-1 rounded-md ${
                message.trim() && !isLoading
                  ? 'text-white bg-[#19c37d] hover:bg-[#1a7f54]'
                  : 'opacity-40 text-gray-400 cursor-not-allowed'
              } transition-all flex items-center justify-center`}
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

export default MessageInput;
