import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApiCustomersSource, createApiUsersSource, getOperationalSession } from '../src/api-sources.ts';

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
