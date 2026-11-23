import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPreviewUsersSource, previewUsersSource } from '../src/users/preview-source.ts';

const query = { search: '', role: 'all', status: 'all', page: 1, pageSize: 3 };
const signal = () => new AbortController().signal;

test('user preview has distinct paginated summaries without identity-provider linkage', async () => {
  const first = await previewUsersSource.list(query, signal());
  const second = await previewUsersSource.list({ ...query, page: 2 }, signal());
  assert.equal(first.total, 6);
  assert.equal(first.totalPages, 2);
  assert.equal(first.items.length, 3);
  assert.equal(second.items.length, 3);
  assert.equal(new Set([...first.items, ...second.items].map((user) => user.id)).size, 6);
  assert.ok(first.items.every((user) => !('externalAuthId' in user)));
});

test('user preview combines role, state and case-insensitive name/email searches', async () => {
  const result = await previewUsersSource.list({ ...query, role: 'CUSTOMER', status: 'disabled', search: '  CLIENTE2@EXAMPLE.INVALID  ' }, signal());
  assert.equal(result.total, 1);
  assert.equal(result.items[0].role, 'CUSTOMER');
  assert.equal(result.items[0].enabled, false);
  const byName = await previewUsersSource.list({ ...query, search: 'OPERADOR' }, signal());
  assert.equal(byName.total, 2);
});

test('user preview returns a genuine empty state and independent copies', async () => {
  const empty = await previewUsersSource.list({ ...query, search: 'not-found' }, signal());
  assert.deepEqual(empty.items, []);
  assert.equal(empty.totalPages, 0);
  const first = await previewUsersSource.list(query, signal());
  const name = first.items[0].displayName;
  first.items[0].displayName = 'changed outside source';
  assert.equal((await previewUsersSource.list(query, signal())).items[0].displayName, name);
});

test('user preview rejects cancelled reads', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(previewUsersSource.list(query, controller.signal), { name: 'AbortError' });
});

test('access changes retain identity, update filters and return actor, time and before/after evidence', async () => {
  const source = createPreviewUsersSource();
  const change = await source.updateAccess('demo-user-operator1', { role: 'COURIER', enabled: false, email: 'injected', id: 'injected' }, signal());
  assert.equal(change.user.id, 'demo-user-operator1');
  assert.equal(change.user.email, 'operador1@example.invalid');
  assert.deepEqual(change.previewAudit.previous, { role: 'OPERATOR', enabled: true });
  assert.deepEqual(change.previewAudit.next, { role: 'COURIER', enabled: false });
  assert.equal(change.previewAudit.actorId, 'demo-user-admin');
  assert.ok(Number.isFinite(Date.parse(change.previewAudit.occurredAt)));
  assert.equal((await source.list({ ...query, search: 'operador1', role: 'COURIER', status: 'disabled' }, signal())).total, 1);
  assert.equal((await source.list({ ...query, search: 'operador1', status: 'enabled' }, signal())).total, 0);
  const restored = await source.updateAccess(change.user.id, { role: 'OPERATOR', enabled: true }, signal());
  assert.equal(restored.user.enabled, true);
  assert.deepEqual(restored.previewAudit.previous, { role: 'COURIER', enabled: false });
});

test('invalid, missing, self-locking and cancelled changes leave all accounts unchanged', async () => {
  const source = createPreviewUsersSource();
  const all = { ...query, pageSize: 20 };
  const before = await source.list(all, signal());
  for (const draft of [{ role: 'OWNER', enabled: true }, { role: 'ADMIN', enabled: 'false' }, null]) {
    await assert.rejects(source.updateAccess('demo-user-operator1', draft, signal()));
  }
  await assert.rejects(source.updateAccess('missing', { role: 'ADMIN', enabled: true }, signal()));
  await assert.rejects(source.updateAccess('demo-user-admin', { role: 'ADMIN', enabled: false }, signal()));
  await assert.rejects(source.updateAccess('demo-user-admin', { role: 'CUSTOMER', enabled: true }, signal()));
  const controller = new AbortController(); controller.abort();
  await assert.rejects(source.updateAccess('demo-user-operator1', { role: 'ADMIN', enabled: true }, controller.signal), { name: 'AbortError' });
  assert.deepEqual(await source.list(all, signal()), before);
});

test('unchanged access creates no evidence and returned records cannot mutate the source', async () => {
  const source = createPreviewUsersSource();
  const saved = await source.updateAccess('demo-user-operator2', { role: 'OPERATOR', enabled: false }, signal());
  assert.equal(saved.previewAudit, null);
  saved.user.role = 'ADMIN';
  assert.equal((await source.list({ ...query, search: 'operador2' }, signal())).items[0].role, 'OPERATOR');
  await source.updateAccess('demo-user-operator2', { role: 'COURIER', enabled: true }, signal());
  assert.equal((await createPreviewUsersSource().list({ ...query, search: 'operador2' }, signal())).items[0].enabled, false);
});
