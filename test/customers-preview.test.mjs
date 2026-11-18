import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPreviewCustomersSource, previewCustomersSource as source } from '../src/customers/preview-source.ts';
import { isCustomerConflict, validateCustomerEdit } from '../src/customers/customer-edit.ts';

const query = { search: '', status: 'all', page: 1, pageSize: 3 };
const signal = () => new AbortController().signal;

test('a stale edit is distinguished from other save errors', () => {
  assert.equal(isCustomerConflict({ status: 409 }), true);
  assert.equal(isCustomerConflict({ status: 500 }), false);
  assert.equal(isCustomerConflict(null), false);
});

test('preview pages contain distinct summaries and consistent totals', async () => {
  const first = await source.list(query, signal());
  const second = await source.list({ ...query, page: 2 }, signal());
  assert.equal(first.total, 4);
  assert.equal(first.totalPages, 2);
  assert.equal(first.items.length, 3);
  assert.equal(second.items.length, 1);
  assert.equal(new Set([...first.items, ...second.items].map((item) => item.id)).size, first.total);
  assert.ok(first.items.every((item) => !('addresses' in item)));
});

test('preview filters by enabled state and matches case-insensitive contact searches', async () => {
  const enabled = await source.list({ ...query, status: 'enabled' }, signal());
  const disabled = await source.list({ ...query, status: 'disabled' }, signal());
  assert.equal(enabled.total, 2);
  assert.ok(enabled.items.every((item) => item.enabled));
  assert.equal(disabled.total, 2);
  assert.ok(disabled.items.every((item) => !item.enabled));
  const matching = await source.list({ ...query, search: '  LIBRERÍA  ' }, signal());
  assert.equal(matching.total, 1);
  assert.equal(matching.items[0].id, 'demo-libreria');
  const contact = await source.list({ ...query, search: 'PERSONA@EXAMPLE.INVALID' }, signal());
  assert.equal(contact.items[0].id, 'demo-persona');
  const empty = await source.list({ ...query, search: 'inexistente' }, signal());
  assert.deepEqual(empty.items, []);
  assert.equal(empty.totalPages, 0);
});

test('preview details retain multiple addresses and missing contact data without invention', async () => {
  assert.equal((await source.get('demo-atelier', signal())).addresses.length, 2);
  const person = await source.get('demo-persona', signal());
  assert.equal(person.addresses.length, 1);
  assert.equal(person.phone, null);
  await assert.rejects(source.get('missing', signal()));
});

test('preview reads reject cancelled requests', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(source.list(query, controller.signal), { name: 'AbortError' });
  await assert.rejects(source.get('demo-atelier', controller.signal), { name: 'AbortError' });
});

test('customer edits require a name and report invalid fields together', () => {
  const result = validateCustomerEdit({ displayName: '  ', legalName: 'x'.repeat(161), email: 'invalid', phone: 'abcdef' });
  assert.equal(result.valid, false);
  assert.deepEqual(Object.keys(result.errors).sort(), ['displayName', 'email', 'legalName', 'phone']);
  assert.equal(validateCustomerEdit({ displayName: 'x'.repeat(121), legalName: '', email: '', phone: '' }).valid, false);
});

test('customer edits normalize optional fields and accept international contact formats', () => {
  const result = validateCustomerEdit({ displayName: '  Nuevo nombre  ', legalName: '  ', email: ' demo@example.invalid ', phone: ' +598 (99) 000-001 ' });
  assert.equal(result.valid, true);
  assert.deepEqual(result.data, { displayName: 'Nuevo nombre', legalName: null, email: 'demo@example.invalid', phone: '+598 (99) 000-001' });
});

test('saved preview edits update detail and search while preserving protected fields', async () => {
  const editable = createPreviewCustomersSource();
  const before = await editable.get('demo-atelier', signal());
  const saved = await editable.update('demo-atelier', {
    displayName: 'Nombre actualizado', legalName: 'Nueva empresa', email: '', phone: '',
    enabled: false, type: 'PERSON', addresses: [],
  }, signal());
  assert.equal(saved.displayName, 'Nombre actualizado');
  assert.equal(saved.email, null);
  assert.equal(saved.phone, null);
  assert.equal(saved.enabled, before.enabled);
  assert.equal(saved.type, before.type);
  assert.deepEqual(saved.addresses, before.addresses);
  assert.equal((await editable.list({ ...query, search: 'Nombre actualizado' }, signal())).total, 1);
  assert.equal((await editable.get('demo-atelier', signal())).legalName, 'Nueva empresa');
  assert.equal((await createPreviewCustomersSource().get('demo-atelier', signal())).displayName, before.displayName);
});

test('failed or cancelled preview edits leave the customer unchanged', async () => {
  const editable = createPreviewCustomersSource();
  const before = await editable.get('demo-atelier', signal());
  const draft = { displayName: 'Nuevo nombre', legalName: '', email: '', phone: '' };
  await assert.rejects(editable.update('demo-atelier', { ...draft, displayName: '' }, signal()));
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(editable.update('demo-atelier', draft, controller.signal), { name: 'AbortError' });
  await assert.rejects(editable.update('missing', draft, signal()));
  assert.deepEqual(await editable.get('demo-atelier', signal()), before);
});
