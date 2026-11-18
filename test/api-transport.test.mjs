import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createApiClient } from '../src/api.ts';
import { createApiCustomersSource, createApiUsersSource } from '../src/api-sources.ts';

test('authenticated transport sends the token and never replaces denied data with fixtures', async () => {
  const server = createServer(async (request, response) => {
    if (request.headers.authorization !== 'Bearer test-token') { response.writeHead(401).end(); return; }
    if (request.url.startsWith('/api/users?')) { response.writeHead(403).end(); return; }
    if (request.method === 'PATCH') {
      assert.equal(request.headers['content-type'], 'application/json');
      let body = '';
      for await (const chunk of request) body += chunk;
      assert.equal(JSON.parse(body).displayName, 'Nuevo nombre');
      response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ id: 'customer-1' }));
      return;
    }
    response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 }));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const request = createApiClient(`http://127.0.0.1:${server.address().port}`, async () => 'test-token');
    const signal = new AbortController().signal;
    const result = await createApiCustomersSource(request).list({ search: '', status: 'all', page: 1, pageSize: 20 }, signal);
    assert.deepEqual(result.items, []);
    const saved = await createApiCustomersSource(request).update('customer-1', { displayName: 'Nuevo nombre', legalName: '', email: '', phone: '' }, signal,
      { id: 'customer-1', displayName: 'Anterior', legalName: null, email: null, phone: null });
    assert.equal(saved.id, 'customer-1');
    await assert.rejects(createApiUsersSource(request).list({ search: '', role: 'all', status: 'all', page: 1, pageSize: 20 }, signal), /403/);
  } finally {
    server.close();
    await once(server, 'close');
  }
});


test('duplicate email errors carry only the known code', async () => {
  const server = createServer((request, response) => response.writeHead(409, { 'Content-Type': 'application/json' }).end(JSON.stringify({ code: 'CUSTOMER_EMAIL_DUPLICATE', internal: 'must not leak' })));
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  try {
    const request = createApiClient(`http://127.0.0.1:${server.address().port}`, async () => 'test-token');
    await assert.rejects(request('/api/test', { signal: new AbortController().signal }), error => error.status === 409 && error.code === 'CUSTOMER_EMAIL_DUPLICATE' && !('internal' in error));
  } finally { server.close(); await once(server, 'close'); }
});
