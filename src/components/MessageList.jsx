import React, { useState, useEffect, useCallback, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

const CopyButton = memo(function CopyButton({ code, label = 'Copy code' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs text-gpt-muted hover:text-gpt-text transition-colors"
      title={label}
    >
      {copied ? (
        <>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
});

function MessageList({ messages, onEditMessage, onRegenerateResponse }) {
  const [_typingDots, setTypingDots] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editContent, setEditContent] = useState('');

  const handleStartEdit = useCallback((index, content) => {
    setEditingIndex(index);
    setEditContent(content);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingIndex(null);
    setEditContent('');
  }, []);

  const handleSubmitEdit = useCallback(() => {
    if (editContent.trim() && onEditMessage) {
      onEditMessage(editingIndex, editContent.trim());
      setEditingIndex(null);
      setEditContent('');
    }
  }, [editingIndex, editContent, onEditMessage]);

  useEffect(() => {
    const isStreaming = messages.some((msg) => msg.isStreaming);
    if (isStreaming) {
      const interval = setInterval(() => {
        setTypingDots((d) => (d.length >= 3 ? '' : d + '.'));
      }, 400);
      return () => clearInterval(interval);
    }
  }, [messages]);

  return (
    <div className="flex-1 py-4 w-full">
      {messages.map((message, index) => (
        <div key={index} className="mb-6">
          <div className="max-w-3xl mx-auto px-4">
            {message.role === 'user' ? (
              <div className="flex gap-3 justify-end group">
                <div className="flex gap-3 max-w-[85%] flex-row-reverse">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                    </svg>
                  </div>
                  {editingIndex === index ? (
                    <div className="flex flex-col gap-2 w-full min-w-[400px] max-w-2xl">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full p-4 rounded-xl bg-gpt-input text-gpt-text border border-gpt-border focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[100px]"
                        rows={Math.max(3, editContent.split('\n').length)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmitEdit();
                          }
                          if (e.key === 'Escape') {
                            handleCancelEdit();
                          }
                        }}
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1.5 text-sm text-gpt-muted hover:text-gpt-text transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSubmitEdit}
                          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Save & Submit
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => handleStartEdit(index, message.content)}
                          className="p-1.5 text-gpt-muted hover:text-gpt-text"
                          title="Edit message"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => navigator.clipboard.writeText(message.content)}
                          className="p-1.5 text-gpt-muted hover:text-gpt-text"
                          title="Copy message"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        </button>
                      </div>
                      <div className="rounded-2xl px-4 py-3 bg-blue-600 text-white">
                        {message.images && message.images.length > 0 && (
                          <div className="flex gap-2 mb-2 flex-wrap">
                            {message.images.map((img, imgIdx) => (
                              <img
                                key={imgIdx}
                                src={img.data}
                                alt={img.name || `Image ${imgIdx + 1}`}
                                className="max-h-48 rounded-lg border border-white/20"
                              />
                            ))}
                          </div>
                        )}
                        {message.files && message.files.length > 0 && (
                          <div className="flex gap-2 mb-2 flex-wrap">
                            {message.files.map((file, fileIdx) => (
                              <div
                                key={fileIdx}
                                className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg"
                              >
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                  <polyline points="14 2 14 8 20 8" />
                                </svg>
                                <span className="text-sm">{file.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="text-[15px] leading-relaxed">{message.content}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex gap-3 group">
                <div className="w-8 h-8 rounded-full bg-gpt-accent flex items-center justify-center text-white shrink-0 shadow-sm">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0 text-gpt-text">
                  <div className="prose max-w-none text-[15px] leading-relaxed prose-invert">
                    {message.isStreaming && message.content === '' ? (
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-gpt-accent animate-pulse"></span>
                        <span
                          className="w-2 h-2 rounded-full bg-gpt-accent animate-pulse"
                          style={{ animationDelay: '0.2s' }}
                        ></span>
                        <span
                          className="w-2 h-2 rounded-full bg-gpt-accent animate-pulse"
                          style={{ animationDelay: '0.4s' }}
                        ></span>
                      </div>
                    ) : (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                          pre: ({ children }) => <div className="not-prose my-4">{children}</div>,
                          code({ className, children, node, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            const codeString = String(children)
                              .replace(/\n$/, '')
                              .replace(/^\n/, '')
                              .trimStart();
                            const isInline =
                              !match &&
                              !codeString.includes('\n') &&
                              node?.position?.start?.line === node?.position?.end?.line;

                            if (isInline) {
                              return (
                                <code
                                  className="bg-gpt-hover text-gpt-text px-1.5 py-0.5 rounded text-sm font-mono"
                                  {...props}
                                >
                                  {children}
                                </code>
                              );
                            }

                            if (match) {
                              return (
                                <div className="rounded-lg overflow-hidden bg-black">
                                  <div className="flex items-center justify-between px-4 py-2 bg-gpt-input text-xs text-gpt-muted">
                                    <span>{match[1]}</span>
                                    <CopyButton code={codeString} />
                                  </div>
                                  <SyntaxHighlighter
                                    style={oneDark}
                                    language={match[1]}
                                    PreTag="div"
                                    customStyle={{
                                      margin: 0,
                                      padding: '1rem',
                                      background: '#0d0d0d',
                                      fontSize: '14px',
                                    }}
                                    codeTagProps={{
                                      style: {
                                        background: 'transparent',
                                      },
                                    }}
                                    wrapLines={false}
                                    {...props}
                                  >
                                    {codeString}
                                  </SyntaxHighlighter>
                                </div>
                              );
                            }

                            return (
                              <div className="rounded-lg overflow-hidden bg-black">
                                <div className="flex items-center justify-end px-4 py-2 bg-gpt-input">
                                  <CopyButton code={codeString} />
                                </div>
                                <pre className="p-4 overflow-x-auto text-sm font-mono text-gpt-text">
                                  <code {...props}>{children}</code>
                                </pre>
                              </div>
                            );
                          },
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    )}
                    {message.isStreaming && message.content !== '' && (
                      <span className="inline-block w-2 h-4 bg-gpt-text animate-pulse ml-0.5"></span>
                    )}
                  </div>
                  {!message.isStreaming && message.content && (
                    <div className="mt-2 flex gap-3 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => navigator.clipboard.writeText(message.content)}
                        className="flex items-center gap-1.5 text-xs text-gpt-muted hover:text-gpt-text transition-colors"
                        title="Copy message"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        Copy
                      </button>
                      {index === messages.length - 1 && onRegenerateResponse && (
                        <button
                          onClick={() => onRegenerateResponse(index)}
                          className="flex items-center gap-1.5 text-xs text-gpt-muted hover:text-gpt-text transition-colors"
                          title="Regenerate response"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M1 4v6h6M23 20v-6h-6" />
                            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                          </svg>
                          Regenerate
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default MessageList;
