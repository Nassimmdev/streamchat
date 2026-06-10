import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { app } from '../index.js';

let server;
let port;

before(async () => {
  server = createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;
});

after(async () => {
  await new Promise((resolve, reject) =>
    server.close(err => (err ? reject(err) : resolve()))
  );
});

const url = (path) => `http://127.0.0.1:${port}${path}`;

// Parse a raw SSE response body into an array of event objects
async function collectEvents(response, { stopAfterDeltas = Infinity, cancelStreamId = null } = {}) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  const events = [];
  let deltaCount = 0;

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
      events.push(event);

      if (event.type === 'delta') {
        deltaCount++;
        if (deltaCount >= stopAfterDeltas && cancelStreamId) {
          // Issue cancel and keep draining
          await fetch(url('/api/cancel'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ streamId: cancelStreamId }),
          });
          cancelStreamId = null; // only cancel once
        }
      }

      if (event.type === 'done' || event.type === 'cancelled' || event.type === 'error') {
        await reader.cancel();
        return events;
      }
    }
  }

  return events;
}

test('health endpoint returns ok', async () => {
  const res = await fetch(url('/api/health'));
  const body = await res.json();
  assert.equal(body.ok, true);
});

test('streaming delivers multiple delta events followed by done', async () => {
  const streamId = crypto.randomUUID();
  const res = await fetch(url('/api/chat'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'hi' }],
      streamId,
    }),
  });

  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'text/event-stream');

  const events = await collectEvents(res);
  const types = events.map(e => e.type);

  // Should have a meta event, several deltas, then done
  assert.ok(types.includes('meta'), 'should include meta event');
  assert.ok(types.filter(t => t === 'delta').length > 5, 'should have more than 5 delta events');
  assert.equal(types[types.length - 1], 'done', 'last event should be done');
});

test('cancellation: server emits cancelled event and stops streaming', async () => {
  const streamId = crypto.randomUUID();
  const res = await fetch(url('/api/chat'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'hi' }],
      streamId,
    }),
  });

  // Cancel after receiving 5 delta events
  const events = await collectEvents(res, { stopAfterDeltas: 5, cancelStreamId: streamId });
  const types = events.map(e => e.type);

  assert.ok(types.includes('cancelled'), 'should receive cancelled event');
  assert.equal(types[types.length - 1], 'cancelled', 'cancelled should be the last event');
});

test('no delta events are emitted after the cancelled event', async () => {
  const streamId = crypto.randomUUID();
  const res = await fetch(url('/api/chat'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'hi' }],
      streamId,
    }),
  });

  const events = await collectEvents(res, { stopAfterDeltas: 3, cancelStreamId: streamId });

  const cancelledIdx = events.findIndex(e => e.type === 'cancelled');
  assert.ok(cancelledIdx !== -1, 'should receive cancelled event');

  const deltasAfterCancel = events.slice(cancelledIdx + 1).filter(e => e.type === 'delta');
  assert.equal(deltasAfterCancel.length, 0, 'no delta events should arrive after cancelled');
});

test('resume: resumeFrom skips already-delivered content', async () => {
  const streamId = crypto.randomUUID();

  // Full response first to measure total content
  const fullRes = await fetch(url('/api/chat'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'hi' }],
      streamId,
    }),
  });
  const fullEvents = await collectEvents(fullRes);
  const replyIndex = fullEvents.find(e => e.type === 'meta')?.replyIndex;
  const fullContent = fullEvents
    .filter(e => e.type === 'delta')
    .map(e => e.content)
    .join('');

  // Reconnect with resumeFrom = first 20 chars
  const resumeFrom = 20;
  const resumeRes = await fetch(url('/api/chat'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'hi' }],
      streamId: crypto.randomUUID(),
      replyIndex,
      resumeFrom,
    }),
  });
  const resumeEvents = await collectEvents(resumeRes);
  const resumedContent = resumeEvents
    .filter(e => e.type === 'delta')
    .map(e => e.content)
    .join('');

  // The resumed content should be shorter (skipped the first resumeFrom chars)
  assert.ok(
    resumedContent.length < fullContent.length,
    'resumed stream should deliver fewer chars than a full stream'
  );
  // The full content should end with the resumed content
  assert.ok(
    fullContent.endsWith(resumedContent.trimStart()),
    'resumed content should be the tail of the full response'
  );
});

test('missing messages returns 400', async () => {
  const res = await fetch(url('/api/chat'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ streamId: crypto.randomUUID() }),
  });
  assert.equal(res.status, 400);
});

test('cancelling unknown streamId returns 404', async () => {
  const res = await fetch(url('/api/cancel'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ streamId: 'does-not-exist' }),
  });
  assert.equal(res.status, 404);
});
