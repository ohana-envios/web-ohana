import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApiCustomersSource, createSelfCustomerSource, createApiUsersSource, getOperationalSession } from '../src/api-sources.ts';

test('customer and user sources send filters, pagination, and cancellation to the API', async () => {
  const calls = [];
  const result = { items: [], page: 2, pageSize: 10, total: 0, totalPages: 0 };
  const request = async (path, init) => { calls.push({ path, init }); return result; };
  const signal = new AbortController().signal;
  const customers = createApiCustomersSource(request);
  const users = createApiUsersSource(request);
  assert.equal(await customers.list({ search: 'Ana & José', status: 'enabled', page: 2, pageSize: 10 }, signal), result);
  assert.equal(await users.list({ search: 'Ana & José', role: 'ADMIN', status: 'disabled', page: 2, pageSize: 10 }, signal), result);
  for (const { path, init } of calls) {
    const url = new URL(path, 'https://example.invalid');
    assert.equal(url.searchParams.get('search'), 'Ana & José');
    assert.equal(url.searchParams.get('page'), '2');
    assert.equal(url.searchParams.get('pageSize'), '10');
    assert.equal(init.signal, signal);
  }
  assert.equal(new URL(calls[0].path, 'https://example.invalid').pathname, '/api/customers');
  assert.equal(new URL(calls[1].path, 'https://example.invalid').searchParams.get('role'), 'ADMIN');
  assert.equal(new URL(calls[1].path, 'https://example.invalid').searchParams.get('status'), 'disabled');
});

test('customer detail encodes the identifier and failures propagate without fictitious data', async () => {
  let path;
  const failure = new Error('Sin acceso');
  const source = createApiCustomersSource(async (value) => { path = value; throw failure; });
  await assert.rejects(source.get('id/otro?valor', new AbortController().signal), (error) => error === failure);
  assert.equal(path, '/api/customers/id%2Fotro%3Fvalor');
});

test('customer edit sends only allowed fields as an authenticated transport request', async () => {
  const signal = new AbortController().signal;
  const original = { id: 'id/1', displayName: 'Anterior', legalName: null, email: null, phone: null };
  const source = createApiCustomersSource(async (path, init) => {
    assert.equal(path, '/api/customers/id%2F1');
    assert.equal(init.method, 'PATCH');
    assert.equal(init.headers['Content-Type'], 'application/json');
    assert.equal(init.signal, signal);
    assert.deepEqual(JSON.parse(init.body), { displayName: 'Nombre', legalName: '', email: '', phone: '', expected: { displayName: 'Anterior', legalName: null, email: null, phone: null } });
    return { id: 'id/1' };
  });
  const draft = { displayName: 'Nombre', legalName: '', email: '', phone: '', enabled: false };
  assert.equal((await source.update('id/1', draft, signal, original)).id, 'id/1');
  await assert.rejects(source.update('id/1', draft, signal));
  await assert.rejects(source.update('otro', draft, signal, original));
});

test('address creation and editing send only address fields and the original version', async () => {
  const calls = [];
  const source = createApiCustomersSource(async (path, init) => { calls.push({ path, init }); return { id: 'customer' }; });
  const signal = new AbortController().signal;
  const draft = { label: '', street: 'Calle', number: '1', locality: 'Centro', department: 'Montevideo', reference: '', notes: '', customerId: 'other' };
  const original = { id: 'address/1', label: null, street: 'Anterior', number: '1', locality: 'Centro', department: 'Montevideo', reference: null, notes: null };
  await source.addAddress('customer/1', draft, signal);
  await source.updateAddress('customer/1', 'address/1', draft, signal, original);
  assert.equal(calls[0].path, '/api/customers/customer%2F1/addresses');
  assert.equal(calls[0].init.method, 'POST');
  assert.equal('customerId' in JSON.parse(calls[0].init.body), false);
  assert.equal(calls[1].path, '/api/customers/customer%2F1/addresses/address%2F1');
  assert.equal(calls[1].init.method, 'PATCH');
  assert.deepEqual(JSON.parse(calls[1].init.body).expected, { label: null, street: 'Anterior', number: '1', locality: 'Centro', department: 'Montevideo', reference: null, notes: null });
  await assert.rejects(source.updateAddress('customer/1', 'address/1', draft, signal));
});

test('address status operations send explicit state to the scoped endpoint', async () => {
  const calls = [];
  const source = createApiCustomersSource(async (path, init) => { calls.push({ path, init }); return {}; });
  const signal = new AbortController().signal;
  await source.deactivateAddress('client/1', 'address/2', signal);
  await source.reactivateAddress('client/1', 'address/2', signal);
  assert.equal(calls[0].path, '/api/customers/client%2F1/addresses/address%2F2/status');
  assert.equal(calls[0].init.method, 'PATCH');
  assert.deepEqual(JSON.parse(calls[0].init.body), { active: false });
  assert.deepEqual(JSON.parse(calls[1].init.body), { active: true });
});

test('user access updates include the displayed original role and status', async () => {
  const signal = new AbortController().signal;
  const original = { id: 'user/1', displayName: 'Operador', email: 'user@example.invalid', role: 'OPERATOR', enabled: true };
  const source = createApiUsersSource(async (path, init) => {
    assert.equal(path, '/api/users/user%2F1/access');
    assert.equal(init.method, 'PATCH');
    assert.equal(init.headers['Content-Type'], 'application/json');
    assert.equal(init.signal, signal);
    assert.deepEqual(JSON.parse(init.body), { role: 'COURIER', enabled: false, expected: { role: 'OPERATOR', enabled: true } });
    return { user: original, audit: null };
  });
  await source.updateAccess('user/1', { role: 'COURIER', enabled: false, actorId: 'spoofed' }, signal, original);
  await assert.rejects(source.updateAccess('user/1', { role: 'COURIER', enabled: false }, signal));
});

test('operational session comes from the API with the same cancellation signal', async () => {
  const signal = new AbortController().signal;
  const user = { id: 'u1', displayName: 'Admin', email: 'admin@example.invalid', role: 'ADMIN', enabled: true };
  assert.equal(await getOperationalSession(async (path, init) => {
    assert.equal(path, '/api/users/me');
    assert.equal(init.signal, signal);
    return user;
  }, signal), user);
  await assert.rejects(getOperationalSession(async () => { throw new Error('Acceso denegado'); }, signal), /denegado/);
});

test('internal user creation sends only explicitly allowed fields', async () => {
  const calls = []; const signal = new AbortController().signal;
  const source = createApiUsersSource(async (path, init) => { calls.push({ path, ...init }); return {}; });
  await source.createInternal({ displayName: 'Nombre', email: 'user@example.invalid', role: 'OPERATOR', enabled: true, externalAuthId: 'ignored' }, signal);
  assert.equal(calls[0].path, '/api/users'); assert.equal(calls[0].method, 'POST'); assert.equal(calls[0].signal, signal);
  assert.deepEqual(JSON.parse(calls[0].body), { displayName: 'Nombre', email: 'user@example.invalid', role: 'OPERATOR' });
});

test('invitation issue encodes the target identifier', async () => {
  const calls = []; const signal = new AbortController().signal;
  const source = createApiUsersSource(async (path, init) => { calls.push({ path, ...init }); return {}; });
  await source.issueInvitation('user/1', signal);
  assert.equal(calls[0].path, '/api/user-invitations/user%2F1'); assert.equal(calls[0].method, 'POST');
});

test('customer status requests send explicit state', async () => {
  const calls = []; const signal = new AbortController().signal;
  const source = createApiCustomersSource(async (path, init) => { calls.push({ path, ...init }); return {}; });
  await source.deactivateCustomer('client/1', signal); await source.reactivateCustomer('client/1', signal);
  assert.equal(calls[0].path, '/api/customers/client%2F1/status');
  assert.deepEqual(JSON.parse(calls[0].body), { enabled: false });
  assert.deepEqual(JSON.parse(calls[1].body), { enabled: true });
});

test('self-service requests never send a customer id or expose a directory', async () => {
  const calls = []; const signal = new AbortController().signal;
  const source = createSelfCustomerSource(async (path, init) => { calls.push({ path, ...init }); return {}; });
  await source.get('other', signal); await source.deactivateAddress('other', 'address/1', signal);
  assert.equal(calls[0].path, '/api/my-customer');
  assert.equal(calls[1].path, '/api/my-customer/addresses/address%2F1/status');
  await assert.rejects(source.list({}, signal));
});


test('customer invitation is scoped to the customer and unavailable to self-service', async () => {
  const signal = new AbortController().signal;
  const source = createApiCustomersSource(async (path, init) => {
    assert.equal(path, '/api/user-invitations/customers/id%2F1');
    assert.equal(init.method, 'POST'); assert.equal(init.signal, signal);
    assert.deepEqual(JSON.parse(init.body), { email: 'cliente@example.invalid' });
    return { code: 'code', expiresAt: '2026-01-01T00:00:00.000Z' };
  });
  assert.equal((await source.inviteCustomer('id/1', 'cliente@example.invalid', signal)).code, 'code');
  assert.equal(createSelfCustomerSource(async () => {}).inviteCustomer, undefined);
});
