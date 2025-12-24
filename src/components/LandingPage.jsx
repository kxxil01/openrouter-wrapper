import { useState, useMemo } from 'react';

function LandingPage({ onLogin }) {
  const initialError = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');
    if (errorParam) {
      window.history.replaceState({}, '', '/');
      if (errorParam === 'access_denied') {
        return 'Access denied. Your email is not authorized to use this application.';
      } else if (errorParam === 'auth_failed') {
        return 'Authentication failed. Please try again.';
      } else {
        return 'An error occurred. Please try again.';
      }
    }
    return null;
  }, []);

  const [error, setError] = useState(initialError);

  return (
    <div className="min-h-screen bg-gpt-bg flex flex-col items-center justify-center p-8">
      {error && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gpt-sidebar rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gpt-text">Access Denied</h3>
            </div>
            <p className="text-gpt-muted mb-6">{error}</p>
            <button
              onClick={() => setError(null)}
              className="w-full py-2.5 bg-gpt-accent text-white rounded-lg font-medium hover:bg-gpt-accent/90 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
      <div className="max-w-2xl text-center">
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-gpt-accent to-emerald-600 flex items-center justify-center shadow-lg">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
            >
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gpt-text mb-4">AI Chat</h1>
          <p className="text-lg text-gpt-muted mb-2">Powered by OpenRouter</p>
          <p className="text-gpt-muted/70">
            Access multiple AI models including DeepSeek, Gemini, Llama, and more.
          </p>
        </div>

        <div className="space-y-4 mb-12">
          <div className="flex items-center gap-4 p-4 bg-gpt-sidebar rounded-xl text-left">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
              >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-gpt-text font-medium">Fast & Free</h3>
              <p className="text-sm text-gpt-muted">Access free AI models with no usage limits</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-gpt-sidebar rounded-xl text-left">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#a855f7"
                strokeWidth="2"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-gpt-text font-medium">Conversation History</h3>
              <p className="text-sm text-gpt-muted">
                Your chats are saved and synced across devices
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-gpt-sidebar rounded-xl text-left">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <h3 className="text-gpt-text font-medium">Secure</h3>
              <p className="text-sm text-gpt-muted">
                Sign in with Google Workspace for secure access
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onLogin}
          className="inline-flex items-center gap-3 px-6 py-3 bg-white text-gray-800 rounded-xl font-medium hover:bg-gray-100 transition-colors shadow-lg"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Sign in with Google
        </button>

        <p className="mt-6 text-sm text-gpt-muted/60">
          By signing in, you agree to our terms of service
        </p>
      </div>
    </div>
  );
}

export default LandingPage;
