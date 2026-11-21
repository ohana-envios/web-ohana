import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRegistrationsSource } from '../src/registrations.ts';

test('registration source sends only approved fields and encodes identifiers', async () => {
  const calls = []; const signal = new AbortController().signal;
  const source = createRegistrationsSource(async (path, init) => { calls.push({ path, ...init }); return {}; });
  await source.register({ displayName: 'Nombre', type: 'PERSON', phone: '', email: 'ignored@example.invalid' }, signal);
  await source.list(2, signal); await source.approve('some/id', signal);
  assert.deepEqual(JSON.parse(calls[0].body), { displayName: 'Nombre', type: 'PERSON', phone: '' });
  assert.equal(calls[0].method, 'POST'); assert.equal(calls[0].signal, signal);
  assert.equal(calls[1].path, '/api/customer-registrations/pending?page=2');
  assert.equal(calls[2].path, '/api/customer-registrations/some%2Fid/approve'); assert.equal(calls[2].method, 'PATCH');
});

test('administrative creation sends only customer details', async () => {
  const calls = []; const signal = new AbortController().signal;
  const source = createRegistrationsSource(async (path, init) => { calls.push({ path, ...init }); return {}; });
  await source.registerByAdmin({ displayName: 'Nombre', type: 'COMPANY', phone: '', email: 'hi@example.invalid', enabled: false }, signal);
  assert.equal(calls[0].path, '/api/customer-registrations/admin');
  assert.deepEqual(JSON.parse(calls[0].body), { displayName: 'Nombre', type: 'COMPANY', phone: '', email: 'hi@example.invalid' });
  assert.equal(calls[0].signal, signal);
});

test('invitation claim submits only the code', async () => {
  const calls = []; const signal = new AbortController().signal;
  const source = createRegistrationsSource(async (path, init) => { calls.push({ path, ...init }); return {}; });
  await source.claimInvitation('test-code', signal);
  assert.equal(calls[0].path, '/api/user-invitations/claim/redeem');
  assert.deepEqual(JSON.parse(calls[0].body), { code: 'test-code' }); assert.equal(calls[0].signal, signal);
});
