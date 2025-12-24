import React from 'react';

function PaywallModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative bg-gpt-sidebar border border-gpt-border rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gpt-text mb-3">Upgrade to Continue</h2>
          <p className="text-gpt-muted mb-6 leading-relaxed">
            You&apos;ve reached your daily limit of 5 free messages. Upgrade your subscription to
            unlock unlimited conversations and access to all AI models.
          </p>
          <div className="space-y-3">
            <button className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg">
              Upgrade Now
            </button>
            <button
              onClick={onClose}
              className="w-full py-3 px-6 text-gpt-muted hover:text-gpt-text transition-colors"
            >
              Maybe Later
            </button>
          </div>
          <p className="mt-6 text-xs text-gpt-muted">Starting at $9.99/month. Cancel anytime.</p>
          <p className="mt-2 text-xs text-gpt-muted">
            Don&apos;t want to upgrade? Your free messages will reset at midnight UTC.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PaywallModal;
