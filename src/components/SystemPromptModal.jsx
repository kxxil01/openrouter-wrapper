import { useState } from 'react';

export default function SystemPromptModal({ isOpen, onClose, currentPrompt, onSave }) {
  const [prompt, setPrompt] = useState('');
  const [lastCurrentPrompt, setLastCurrentPrompt] = useState(null);

  if (currentPrompt !== lastCurrentPrompt) {
    setLastCurrentPrompt(currentPrompt);
    setPrompt(currentPrompt || '');
  }

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(prompt.trim() || null);
    onClose();
  };

  const handleClear = () => {
    setPrompt('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-2xl mx-4 shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">System Prompt</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-4">
          <p className="text-sm text-gray-400 mb-3">
            Set custom instructions for this conversation. The AI will follow these instructions for
            all messages.
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="You are a helpful coding assistant. Always provide code examples when relevant..."
            className="w-full h-48 bg-gray-900 text-white rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
            autoFocus
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">{prompt.length} characters</span>
            <button
              onClick={handleClear}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
