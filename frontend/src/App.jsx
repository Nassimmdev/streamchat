import { useRef, useEffect } from 'react';
import { useChat } from './hooks/useChat';
import Message from './components/Message';
import ChatInput from './components/ChatInput';

const SUGGESTIONS = [
  "I'd like to plan a trip to Japan",
  "What's the best time to visit Bali?",
  "Tips for traveling on a budget",
  "Plan a family-friendly holiday",
];

export default function App() {
  const { messages, streaming, error, send, stop, regenerate, retryLast, clearHistory } = useChat();
  const bottomRef = useRef(null);

  const showSuggestions = messages.length === 0 && !streaming;

  const lastMsg = messages[messages.length - 1];
  const showRetry      = !streaming && lastMsg?.role === 'assistant' && lastMsg.status === 'error';
  const showRegenerate = !streaming && lastMsg?.role === 'assistant' &&
    (lastMsg.status === 'done' || lastMsg.status === 'cancelled') && !showRetry;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <div className="header__avatar">
          <div className="header__avatar-img" aria-hidden="true">🧳</div>
          <span className="header__status-dot" aria-label="Online" />
        </div>
        <span className="header__name">Maya</span>
        <div className="header__right">
          <span className="header__powered">Powered by <span>Maya</span></span>
          {messages.length > 0 && (
            <button
              className="header__icon-btn"
              onClick={clearHistory}
              aria-label="Clear conversation"
              title="Clear conversation"
            >
              ✕
            </button>
          )}
          <button className="header__icon-btn" aria-label="More options" title="More options">···</button>
          <button className="header__icon-btn" aria-label="Minimize" title="Minimize">—</button>
        </div>
      </header>

      {/* ── Messages ── */}
      <main className="chat-window" role="log" aria-live="polite" aria-label="Chat messages">
        {messages.map(msg => (
          <Message key={msg.id} message={msg} />
        ))}

        {showRetry && (
          <div className="regenerate-row">
            <button className="regenerate-btn regenerate-btn--retry" onClick={retryLast} aria-label="Retry">
              ↺ Retry
            </button>
          </div>
        )}

        {showRegenerate && (
          <div className="regenerate-row">
            <button className="regenerate-btn" onClick={regenerate} aria-label="Regenerate last reply">
              ↻ Regenerate
            </button>
          </div>
        )}

        {showSuggestions && (
          <div className="suggestions" role="group" aria-label="Suggested messages">
            {SUGGESTIONS.map(s => (
              <button key={s} className="suggestion-chip" onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="error-banner" role="alert">{error}</div>
        )}
        <div ref={bottomRef} />
      </main>

      {/* ── Input ── */}
      <footer className="input-area">
        <ChatInput onSend={send} onStop={stop} streaming={streaming} />
      </footer>
    </div>
  );
}
