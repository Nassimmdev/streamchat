export default function Message({ message }) {
  const { role, content, status } = message;

  return (
    <div className={`message message--${role}${status === 'reconnecting' ? ' message--reconnecting' : ''}`}>
      <div className="message__bubble">
        {content}
        {status === 'streaming' && <span className="cursor" aria-hidden="true" />}
        {status === 'reconnecting' && !content && <span className="cursor" aria-hidden="true" />}
      </div>
      {status === 'cancelled' && content && (
        <span className="message__tag">stopped</span>
      )}
      {status === 'reconnecting' && (
        <span className="message__tag message__tag--reconnecting">reconnecting…</span>
      )}
      {status === 'error' && (
        <span className="message__tag message__tag--error">failed to send</span>
      )}
    </div>
  );
}
