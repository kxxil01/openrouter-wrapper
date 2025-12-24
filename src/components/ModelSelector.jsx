import { useState, useRef, useEffect } from 'react';

function ModelSelector({ models, selectedModel, onModelChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className="flex items-center gap-2 px-3 py-1.5 text-gpt-text hover:bg-gpt-hover transition-colors text-sm rounded-lg font-medium"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedModel.name}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-20 w-80 top-full mt-1 bg-gpt-sidebar border border-gpt-border rounded-xl shadow-xl overflow-hidden">
          <div className="py-2 max-h-80 overflow-y-auto">
            {models.map((model) => (
              <button
                key={model.id}
                className={`w-full px-4 py-3 text-left hover:bg-gpt-hover transition-colors ${
                  model.id === selectedModel.id ? 'bg-gpt-hover' : ''
                }`}
                onClick={() => {
                  onModelChange(model);
                  setIsOpen(false);
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gpt-text">{model.name}</div>
                    <div className="text-xs text-gpt-muted mt-0.5">{model.id}</div>
                  </div>
                  {model.id === selectedModel.id && (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-gpt-accent"
                    >
                      <path d="M20 6L9 17l-5-5" />
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
