import { useState, useRef, useEffect } from 'react';

function MessageInput({ onSendMessage, isLoading }) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);

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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative rounded-3xl bg-gpt-input border border-gpt-border/50 shadow-xl">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          className="w-full resize-none border-0 bg-transparent py-4 pl-5 pr-14 focus:ring-0 focus:outline-none text-[15px] text-gpt-text placeholder-gpt-muted/70 rounded-3xl min-h-[56px] max-h-[200px]"
          rows={1}
          disabled={isLoading}
        />

        <button
          type="submit"
          disabled={!message.trim() || isLoading}
          className={`absolute right-3 bottom-3 p-2 rounded-full transition-all ${
            message.trim() && !isLoading
              ? 'bg-gpt-accent text-white hover:bg-gpt-accent/80'
              : 'bg-gpt-border/50 text-gpt-muted/50 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          )}
        </button>
      </div>
    </form>
  );
}

export default MessageInput;
