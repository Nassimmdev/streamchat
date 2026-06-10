import { useState, useRef, useCallback, useEffect } from 'react';

const BASE = import.meta.env.VITE_API_BASE_URL || '';
const STORAGE_KEY = 'streamchat_v1';
const MAX_RETRIES = 3;

function loadMessages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useChat() {
  const [messages, setMessages] = useState(loadMessages);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);

  const messagesRef = useRef(messages);
  const streamIdRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Persist only completed messages
  useEffect(() => {
    const completed = messages.filter(
      m => m.status !== 'streaming' && m.status !== 'reconnecting'
    );
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(completed)); } catch {}
  }, [messages]);

  // Core single-attempt stream. progress.content tracks chars emitted this attempt.
  const streamOnce = useCallback(async ({
    history, assistantId, replyIndex, resumeFrom, streamId, signal, progress,
  }) => {
    const response = await fetch(`${BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history, streamId, replyIndex, resumeFrom }),
      signal,
    });
    if (!response.ok) throw new Error(`Server error ${response.status}`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        let event;
        try { event = JSON.parse(line.slice(6)); } catch { continue; }

        switch (event.type) {
          case 'meta':
            progress.replyIndex = event.replyIndex;
            break;
          case 'delta':
            progress.content += event.content;
            setMessages(prev => prev.map(m =>
              m.id === assistantId
                ? { ...m, content: m.content + event.content, status: 'streaming' }
                : m
            ));
            break;
          case 'done':
            setMessages(prev => prev.map(m =>
              m.id === assistantId ? { ...m, status: 'done' } : m
            ));
            break;
          case 'cancelled':
            setMessages(prev => prev.map(m =>
              m.id === assistantId ? { ...m, status: 'cancelled' } : m
            ));
            break;
          case 'error':
            throw new Error(event.message);
        }
      }
    }
  }, []);

  // Retry loop — handles reconnect transparently
  const streamWithRetry = useCallback(async ({ history, assistantId }) => {
    const progress = { content: '', replyIndex: null };

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const streamId = crypto.randomUUID();
      streamIdRef.current = streamId;

      try {
        await streamOnce({
          history,
          assistantId,
          replyIndex: progress.replyIndex,
          resumeFrom: progress.content.length,
          streamId,
          signal: abortRef.current.signal,
          progress,
        });
        return; // success
      } catch (err) {
        if (err.name === 'AbortError' || abortRef.current?.signal.aborted) {
          setMessages(prev => prev.map(m =>
            m.id === assistantId ? { ...m, status: 'cancelled' } : m
          ));
          return;
        }

        if (attempt === MAX_RETRIES) {
          setError(err.message);
          setMessages(prev => prev.map(m =>
            m.id === assistantId ? { ...m, status: 'error' } : m
          ));
          return;
        }

        // Network failure — show reconnecting state and retry
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, status: 'reconnecting' } : m
        ));
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        if (abortRef.current?.signal.aborted) return;
      }
    }
  }, [streamOnce]);

  const send = useCallback(async (text) => {
    if (streaming) return;
    setError(null);
    setStreaming(true);
    abortRef.current = new AbortController();

    const userMsg = { id: crypto.randomUUID(), role: 'user', content: text, status: 'done' };
    const assistantId = crypto.randomUUID();

    // Snapshot history before state update (ref still has old messages)
    const history = [...messagesRef.current, userMsg].map(({ role, content }) => ({ role, content }));

    setMessages(prev => [
      ...prev,
      userMsg,
      { id: assistantId, role: 'assistant', content: '', status: 'streaming' },
    ]);

    await streamWithRetry({ history, assistantId });

    setStreaming(false);
    abortRef.current = null;
  }, [streaming, streamWithRetry]);

  const stop = useCallback(async () => {
    const streamId = streamIdRef.current;
    if (!streamId) return;
    abortRef.current?.abort();
    try {
      await fetch(`${BASE}/api/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamId }),
      });
    } catch {}
  }, []);

  const regenerate = useCallback(async () => {
    const msgs = messagesRef.current;
    if (streaming || msgs.length === 0) return;

    let lastAssistantIdx = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'assistant') { lastAssistantIdx = i; break; }
    }
    if (lastAssistantIdx === -1) return;

    const assistantId = msgs[lastAssistantIdx].id;
    // History = everything before the last assistant message (up to last user message)
    const history = msgs
      .slice(0, lastAssistantIdx)
      .map(({ role, content }) => ({ role, content }));

    setError(null);
    setStreaming(true);
    abortRef.current = new AbortController();

    // Reset the assistant bubble to empty+streaming
    setMessages(prev => prev.map(m =>
      m.id === assistantId ? { ...m, content: '', status: 'streaming' } : m
    ));

    await streamWithRetry({ history, assistantId });

    setStreaming(false);
    abortRef.current = null;
  }, [streaming, streamWithRetry]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    setError(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  return { messages, streaming, error, send, stop, regenerate, clearHistory };
}
