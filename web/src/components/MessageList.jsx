import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

function MessageList({ messages }) {
  // State for typing indicator
  const [typingDots, setTypingDots] = useState('.');
  
  // Format timestamp to a readable format
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Animate typing indicator
  useEffect(() => {
    const isStreaming = messages.some(msg => msg.isStreaming);
    
    if (isStreaming) {
      const interval = setInterval(() => {
        setTypingDots(dots => dots.length >= 3 ? '.' : dots + '.');
      }, 500);
      
      return () => clearInterval(interval);
    }
  }, [messages]);

  return (
    <div className="space-y-6 py-2">
      {messages.map((message, index) => (
        <div 
          key={index} 
          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div 
            className={`
              max-w-3xl rounded-lg p-4 
              ${message.role === 'user' 
                ? 'bg-white border border-gray-200' 
                : 'bg-claude-light'
              }
            `}
            style={{ width: 'fit-content', maxWidth: '85%' }}
          >
            <div className="flex items-center mb-2">
              {message.role === 'assistant' ? (
                <div className="w-6 h-6 rounded-full bg-claude-primary flex items-center justify-center text-white mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-white mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              <div className="font-medium">
                {message.role === 'user' ? 'You' : 'Claude'}
              </div>
              {message.timestamp && (
                <div className="text-xs text-gray-500 ml-2">
                  {formatTime(message.timestamp)}
                </div>
              )}
            </div>
            
            <div className="prose prose-sm max-w-none">
              {message.isStreaming && message.content === '' ? (
                <div className="flex items-center">
                  <span className="inline-block h-2 w-2 rounded-full bg-claude-primary mr-1 animate-pulse"></span>
                  <span className="inline-block h-2 w-2 rounded-full bg-claude-primary mx-1 animate-pulse delay-150"></span>
                  <span className="inline-block h-2 w-2 rounded-full bg-claude-primary ml-1 animate-pulse delay-300"></span>
                </div>
              ) : (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    code({node, inline, className, children, ...props}) {
                      const match = /language-(\w+)/.exec(className || '');
                      const codeString = String(children).replace(/\n$/, '');
                      
                      // For inline code
                      if (inline) {
                        return (
                          <code className={`font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded ${className || ''}`} {...props}>
                            {children}
                          </code>
                        );
                      }
                      
                      // For code blocks
                      if (!inline && match) {
                        const [copyButtonText, setCopyButtonText] = useState('Copy');
                        
                        const handleCopy = () => {
                          navigator.clipboard.writeText(codeString);
                          setCopyButtonText('Copied!');
                          setTimeout(() => setCopyButtonText('Copy'), 2000);
                        };
                        
                        return (
                          <div className="relative group">
                            <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={handleCopy}
                                className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-2 py-1 rounded"
                              >
                                {copyButtonText}
                              </button>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex justify-between">
                              <span className="font-medium">{match[1]}</span>
                            </div>
                            <SyntaxHighlighter
                              style={vscDarkPlus}
                              language={match[1]}
                              PreTag="div"
                              wrapLines={true}
                              showLineNumbers={true}
                              lineNumberStyle={{ minWidth: '2.5em', paddingRight: '1em', color: '#606366' }}
                              customStyle={{
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem',
                                lineHeight: '1.5rem'
                              }}
                              {...props}
                            >
                              {codeString}
                            </SyntaxHighlighter>
                          </div>
                        );
                      }
                      
                      // For code blocks without language specification
                      return (
                        <div className="relative group">
                          <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-auto">
                            <code className={className} {...props}>
                              {children}
                            </code>
                          </pre>
                        </div>
                      );
                    }
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              )}
              {message.isStreaming && message.content !== '' && (
                <span className="inline-block ml-1 font-medium text-claude-primary">
                  {typingDots}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default MessageList;
