# StreamChat

A real-time streaming chat application built with React 18 and Node.js. Responses stream word-by-word using Server-Sent Events, with a stop button that cancels work on the server, optimistic UI, and full conversation persistence.

## How to run locally

### Prerequisites

- Node.js 18+

### 1. Backend

```bash
cd backend
npm install
npm run dev
```

Server starts on `http://localhost:3001`.

### 2. Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

> No API key required — the backend uses a built-in set of canned travel responses to simulate streaming AI replies.

### Run the tests

```bash
cd backend
npm test
```

7 integration tests covering streaming, cancellation, resume, and edge cases.

---

## Environment variables

**Backend (`backend/.env`)**

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:5173` |

**Frontend (production only)**

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Full backend URL, e.g. `https://streamchat-api.onrender.com` |

In development the Vite proxy forwards `/api` requests to `localhost:3001` automatically.

---

## Bonus points covered

| Feature | Details |
|---------|---------|
| **Persist conversations** | Full conversation stored in `localStorage` (`streamchat_v1`). Survives page refresh. Cleared via the ✕ button in the header. |
| **Resume after reconnect** | If the SSE connection drops mid-stream, the client retries up to 3 times with exponential backoff. Each retry sends `resumeFrom` (chars already received) and `replyIndex` so the server skips already-delivered tokens and continues seamlessly. |
| **Regenerate** | A "↻ Regenerate" button appears below the last assistant message. It resets that bubble to empty and re-streams a fresh reply using the same conversation history. |
| **Tests** | 7 integration tests in `backend/test/chat.test.mjs` using Node's built-in `node:test`. Covers: cancellation stops the server, no delta events after `cancelled`, resume skips already-delivered content, missing-messages 400, unknown-streamId 404. |
| **Docker** | `docker-compose up --build` starts both services. nginx proxies `/api` to the backend with SSE buffering disabled. |

---

## Deployment

### Backend → Render

1. Push to GitHub and connect the repo to [Render](https://render.com)
2. New Web Service → root directory: `backend`
3. Build command: `npm install` | Start command: `npm start`
4. Add env var: `CORS_ORIGIN=https://your-app.vercel.app`
5. Note your Render URL

### Frontend → Vercel

1. Connect the same repo to [Vercel](https://vercel.com)
2. Root directory: `frontend`
3. Add env var: `VITE_API_BASE_URL=https://your-render-url.onrender.com`
4. Deploy

### Docker

```bash
docker-compose up --build
```

Opens at [http://localhost](http://localhost).

---
