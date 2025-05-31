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
        className="flex items-center gap-1.5 p-2 text-gray-400 hover:text-white transition-colors text-xs rounded-md hover:bg-[#2a2a2a]"
        onClick={() => setIsOpen(!isOpen)}
        title="Select model"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="font-medium hidden sm:inline">{selectedModel.name.split(' ').slice(-2).join(' ')}</span>
      </button>

      {isOpen && (
        <div className="absolute z-20 w-64 bottom-full mb-1 bg-[#171717] border-[1px] border-[#2a2a2a] rounded-lg shadow-lg overflow-hidden right-0">
          <div className="max-h-60 overflow-y-auto py-1">
            <div className="px-3 py-2 text-xs text-gray-400 border-b-[1px] border-[#2a2a2a] font-semibold">Select a model</div>
            {models.map((model) => (
              <button
                key={model.id}
                className={`w-full px-3 py-3 text-left hover:bg-[#2a2a2a] transition-colors text-sm ${
                  model.id === selectedModel.id ? 'bg-[#2a2a2a]' : ''
                }`}
                onClick={() => {
                  onModelChange(model);
                  setIsOpen(false);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-medium truncate text-white">
                      {model.name}
                    </span>
                    <span className="text-xs text-gray-400 mt-0.5">
                      {model.id.split('/')[1]}
                    </span>
                  </div>
                  {model.id === selectedModel.id && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
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
