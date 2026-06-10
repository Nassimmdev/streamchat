import { useState, useRef } from 'react';

export default function ChatInput({ onSend, onStop, streaming }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleChange = (e) => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  return (
    <div className="chat-input">
      <textarea
        ref={textareaRef}
        className="chat-input__textarea"
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Ask about destinations, tips…"
        rows={1}
        aria-label="Message input"
      />
      {streaming ? (
        <button
          type="button"
          className="btn btn--stop"
          onClick={onStop}
          aria-label="Stop generating"
          title="Stop"
        >
          ■
        </button>
      ) : (
        <button
          type="button"
          className="btn btn--send"
          onClick={submit}
          disabled={!text.trim()}
          aria-label="Send message"
          title="Send"
        >
          ↑
        </button>
      )}
    </div>
  );
}
