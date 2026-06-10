# Architecture

## High-level overview

```
┌─────────────────────────────────────────┐        ┌──────────────────────────────────────┐
│                Browser                   │        │           Node.js Backend             │
│                                          │        │                                       │
│  ┌───────────────────────────────────┐  │        │  POST /api/chat                       │
│  │           React App               │  │  SSE   │  ┌──────────────────────────────┐    │
│  │                                   │◄─┼────────┤  │  Express                      │    │
│  │  useChat hook                     │  │        │  │  mock word-by-word streamer   │    │
│  │  ├─ fetch POST /api/chat          ├──┼────────►  │  AbortController Map          │    │
│  │  ├─ ReadableStream SSE parser     │  │        │  └──────────────────────────────┘    │
│  │  ├─ optimistic message state      │  │        │                                       │
│  │  ├─ retry loop (reconnect)        │  │        │  POST /api/cancel                     │
│  │  └─ localStorage persistence      │  │        │  (looks up AbortController by         │
│  │                                   │  │        │   streamId, calls .abort())            │
│  │  Stop button                      ├──┼────────►                                       │
│  │  └─ abort fetch + POST /cancel    │  │        └──────────────────────────────────────┘
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

The frontend is a React 18 single-page app bundled with Vite. The backend is a plain Express server. They communicate exclusively over HTTP — one POST per chat turn to open the SSE stream, and a second POST to `/api/cancel` if the user stops early.

---

## Streaming transport: SSE over POST

**Why SSE and not WebSocket?**

Chat is unidirectional after each user message: the user sends one request, the server streams one reply. WebSocket is full-duplex (both sides can push at any time), which is the right tool for multiplayer games or live collaboration, but unnecessary overhead here. It also requires a protocol upgrade handshake and more complex infrastructure (load balancer sticky sessions, separate WS port).

SSE is plain HTTP/1.1, works through every proxy and CDN out of the box, and maps directly to the pattern: one request, one streamed response.

**The POST caveat**

The native `EventSource` browser API only supports GET. Since we need to POST the full conversation history on every turn, we use `fetch` with `response.body.getReader()` instead. This gives identical wire semantics (`Content-Type: text/event-stream`, `data: ...\n\n` lines) with POST support and no extra library.

---

## How a message flows through the system

```
User hits Send
  │
  ▼
useChat.send(text)
  ├─ appends userMsg to state immediately          ← optimistic UI
  ├─ appends empty assistantPlaceholder { status: 'streaming' }
  └─ fetch POST /api/chat { messages, streamId, replyIndex, resumeFrom }
       │
       ▼
  Express /api/chat handler
  ├─ stores AbortController in Map<streamId, controller>
  ├─ sets SSE headers, calls res.flushHeaders()    ← client starts receiving
  ├─ picks canned reply (by index)
  └─ for each word:
       ├─ checks controller.signal.aborted
       ├─ res.write("data: {type:'delta', content:'word '}\n\n")
       └─ await sleep(40–80 ms)
       │
       ▼
  frontend ReadableStream reader
  ├─ decoder.decode(chunk) → split on \n → parse JSON
  ├─ type='meta'      → store replyIndex for reconnect
  ├─ type='delta'     → setMessages: append content to placeholder
  ├─ type='done'      → setMessages: status = 'done'
  ├─ type='cancelled' → setMessages: status = 'cancelled'
  └─ type='error'     → throw → caught by retry loop

Stream ends → setStreaming(false) → Stop button hides
```

---

## How Stop cancels work on the server

Pressing Stop does **two things in parallel**:

1. **`abortRef.current.abort()`** — aborts the local `fetch`. The browser stops reading bytes from the response body. This is instant and purely client-side.

2. **`POST /api/cancel { streamId }`** — the backend looks up the `AbortController` stored for that `streamId` and calls `.abort()`. The streaming loop checks `controller.signal.aborted` at the top of every iteration and breaks on the next word boundary. The server then writes `{ type: 'cancelled' }` and calls `res.end()`.

Step 2 is critical. Without it, the server keeps iterating through the word array and sleeping, burning CPU and holding the connection open until the full reply is exhausted — even though no client is reading. The `streams` Map is cleaned up in the `finally` block whether the stream ends normally, is cancelled, or throws.

---

## Failure cases

### Handled

| Case | Behaviour |
|------|-----------|
| Network drop mid-stream | `reader.read()` rejects → caught by retry loop → shows "reconnecting…" tag on the bubble → retries up to 3× with 1 s / 2 s / 3 s backoff |
| Reconnect continuation | Client sends `resumeFrom` (chars already received) + `replyIndex`; server skips already-delivered tokens and continues the same reply |
| Server returns non-2xx | Treated as a network error; same retry loop applies |
| All retries exhausted | Bubble status set to `error`; error banner shown |
| Stop during reconnect backoff | `AbortController.signal` is checked before retrying; loop exits cleanly |
| User closes tab mid-stream | Browser aborts the fetch; the server's next `controller.signal.aborted` check breaks the loop and cleans up the Map entry |
| Empty / missing `messages` body | Server returns `400` immediately, before opening the SSE connection |
| Cancel of unknown `streamId` | Server returns `404`; client ignores it (best-effort cancel) |

### Knowingly left out

| Case | Reason |
|------|--------|
| Multi-tab sync | localStorage is read once on mount; two tabs will diverge. Fixing this requires a `storage` event listener or a shared-worker approach — out of scope for a single-user chat widget. |
| Server-side persistence | Conversations live in browser localStorage only. A real product would store history in a database tied to a user account. |
| Auth / rate limiting | No authentication on `/api/chat`. In production, requests should be authenticated and rate-limited per user. |
| Message ordering guarantees | If two requests somehow fire simultaneously (shouldn't happen — the UI disables the input while streaming), the `messageIndex` counter is not atomic. |
| SSE reconnect via `Last-Event-ID` | Standard SSE has a built-in reconnect header. We implement our own `resumeFrom` mechanism instead, because standard `EventSource` doesn't support POST. A production system using a GET-based SSE endpoint could leverage the native header. |
