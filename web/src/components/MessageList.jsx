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
              max-w-full rounded-lg p-4 
              ${message.role === 'user' 
                ? 'bg-dark-tertiary border border-dark-border' 
                : 'bg-dark-secondary'
              }
            `}
            style={{ width: message.role === 'user' ? 'fit-content' : '100%', maxWidth: '100%' }}
          >
            <div className="flex items-center mb-2">
              {message.role === 'assistant' ? (
                <div className="w-6 h-6 rounded-full bg-dark-accent flex items-center justify-center text-dark-text mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-dark-hover flex items-center justify-center text-dark-text mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              <div className="font-medium text-dark-text">
                {message.role === 'user' ? 'You' : 'Claude'}
              </div>
              {message.timestamp && (
                <div className="text-xs text-dark-muted ml-2">
                  {formatTime(message.timestamp)}
                </div>
              )}
            </div>
            
            <div className="message-content prose prose-dark max-w-none leading-relaxed text-dark-text">
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
                    // Override the paragraph component to prevent nesting issues
                    p: ({node, className, children, ...props}) => {
                      return <div className={`paragraph ${className || ''}`} {...props}>{children}</div>;
                    },
                    // Override the pre component to prevent nesting issues
                    pre: ({node, children, ...props}) => {
                      return <div className="pre-wrapper" {...props}>{children}</div>;
                    },
                    code({node, inline, className, children, ...props}) {
                      const match = /language-(\w+)/.exec(className || '');
                      const codeString = String(children).replace(/\n$/, '');
                      
                      // For inline code
                      if (inline) {
                        return (
                          <span 
                            className={`inline-code font-mono px-2 py-0.5 rounded-md text-sm ${className || ''}`} 
                            style={{ backgroundColor: '#1e293b', color: '#f1f5f9', fontFamily: 'Fira Code, monospace', letterSpacing: '0.025em' }}
                            {...props}
                          >
                            {children}
                          </span>
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
                          <div className="relative group overflow-x-auto max-w-full">
                            <div className="absolute right-3 top-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={handleCopy}
                                className="bg-dark-accent hover:bg-dark-hover text-dark-text text-xs px-3 py-1.5 rounded-md font-medium shadow-sm transition-colors duration-200 flex items-center gap-1"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                                </svg>
                                {copyButtonText}
                              </button>
                            </div>
                            <div className="text-xs text-dark-muted mb-2 flex justify-between items-center px-1">
                              <span className="font-medium bg-dark-tertiary px-2 py-0.5 rounded-md">{match[1]}</span>
                            </div>
                            <SyntaxHighlighter
                              style={vscDarkPlus}
                              language={match[1]}
                              PreTag="div"
                              CodeTag="div"
                              wrapLines={true}
                              showLineNumbers={true}
                              lineNumberStyle={{ minWidth: '2.5em', paddingRight: '1em', color: '#64748b', fontFamily: 'Fira Code, monospace' }}
                              codeTagProps={{ className: 'syntax-code-content' }}
                              customStyle={{
                                borderRadius: '0.5rem',
                                fontSize: '0.9rem',
                                lineHeight: '1.6rem',
                                backgroundColor: '#0f172a',
                                color: '#f8fafc',
                                width: 'auto',
                                maxWidth: '100%',
                                overflowX: 'auto',
                                padding: '1.25rem',
                                border: '1px solid #334155',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                fontFamily: 'Fira Code, monospace',
                                letterSpacing: '0.025em'
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
                        <div className="relative group overflow-x-auto max-w-full">
                          <div className="code-block-wrapper rounded-lg overflow-auto" 
                            style={{ 
                              backgroundColor: '#0f172a', 
                              width: 'auto', 
                              maxWidth: '100%', 
                              overflowX: 'auto',
                              border: '1px solid #334155',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                              fontFamily: 'Fira Code, monospace',
                              fontSize: '0.9rem',
                              lineHeight: '1.6rem',
                              letterSpacing: '0.025em',
                              padding: '1.25rem'
                            }}>
                            <span className={`code-content ${className || ''}`} style={{ color: '#f8fafc' }} {...props}>
                              {children}
                            </span>
                          </div>
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
