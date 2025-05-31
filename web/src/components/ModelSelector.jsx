import React, { useState, useRef, useEffect } from 'react';

function ModelSelector({ models, selectedModel, onModelChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className="flex items-center gap-1 p-1.5 text-dark-muted hover:text-dark-text transition-colors text-xs"
        onClick={() => setIsOpen(!isOpen)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-20 w-48 bottom-full mb-1 bg-dark-secondary border border-dark-border rounded-lg shadow-lg overflow-hidden right-0">
          <div className="max-h-60 overflow-y-auto py-1">
            {models.map((model) => (
              <button
                key={model.id}
                className={`w-full px-3 py-2 text-left hover:bg-dark-hover transition-colors text-xs ${
                  model.id === selectedModel.id ? 'bg-dark-tertiary' : ''
                }`}
                onClick={() => {
                  onModelChange(model);
                  setIsOpen(false);
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">
                    {model.name}
                  </span>
                  {model.id === selectedModel.id && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-dark-accent" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ModelSelector;
