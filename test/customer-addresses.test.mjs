import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPreviewCustomersSource } from '../src/customers/preview-source.ts';
import { validateCustomerAddress, hasDuplicateAddress } from '../src/customers/customer-address.ts';

const signal = () => new AbortController().signal;
const draft = { label: '', street: ' Calle nueva ', number: 's/n', locality: 'Centro', department: 'Montevideo', reference: ' ', notes: '' };

test('addresses require all location fields and accept textual numbers', () => {
  const invalid = validateCustomerAddress({ ...draft, street: ' ', number: '', locality: '', department: '' });
  assert.equal(invalid.valid, false);
  assert.deepEqual(Object.keys(invalid.errors).sort(), ['department', 'locality', 'number', 'street']);
  const valid = validateCustomerAddress(draft);
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.data, { label: null, street: 'Calle nueva', number: 's/n', locality: 'Centro', department: 'Montevideo', reference: null, notes: null });
  assert.equal(validateCustomerAddress({ ...draft, notes: 'x'.repeat(501) }).valid, false);
});

test('adding a preview address assigns an id and updates only the selected customer and list count', async () => {
  const source = createPreviewCustomersSource();
  const other = await source.get('demo-atelier', signal());
  const saved = await source.addAddress('demo-persona', { ...draft, id: 'injected', customerId: 'demo-atelier' }, signal());
  assert.equal(saved.addressCount, 1);
  assert.equal(saved.addresses.length, 1);
  assert.ok(saved.addresses[0].id);
  assert.notEqual(saved.addresses[0].id, 'injected');
  assert.equal(saved.addresses[0].street, 'Calle nueva');
  assert.deepEqual(await source.get('demo-atelier', signal()), other);
  const listed = await source.list({ search: 'Persona', status: 'all', page: 1, pageSize: 20 }, signal());
  assert.equal(listed.items[0].addressCount, 1);
  assert.equal((await createPreviewCustomersSource().get('demo-persona', signal())).addresses.length, 0);
});

test('editing an address preserves its id, other addresses and customer fields', async () => {
  const source = createPreviewCustomersSource();
  const before = await source.get('demo-atelier', signal());
  const addressId = before.addresses[0].id;
  const saved = await source.updateAddress('demo-atelier', addressId, { ...draft, label: 'Local actualizado', id: 'injected', enabled: false }, signal());
  assert.equal(saved.addresses[0].id, addressId);
  assert.equal(saved.addresses[0].label, 'Local actualizado');
  assert.deepEqual(saved.addresses[1], before.addresses[1]);
  assert.equal(saved.addressCount, before.addressCount);
  assert.equal(saved.displayName, before.displayName);
  assert.equal(saved.enabled, before.enabled);
});

test('cross-customer, missing, invalid and cancelled address writes leave data unchanged', async () => {
  const source = createPreviewCustomersSource();
  const before = await source.get('demo-atelier', signal());
  const addressId = before.addresses[0].id;
  await assert.rejects(source.updateAddress('demo-persona', addressId, draft, signal()));
  await assert.rejects(source.updateAddress('demo-atelier', 'missing', draft, signal()));
  await assert.rejects(source.addAddress('missing', draft, signal()));
  await assert.rejects(source.addAddress('demo-atelier', { ...draft, street: '' }, signal()));
  await assert.rejects(source.updateAddress('demo-atelier', addressId, { ...draft, number: '' }, signal()));
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(source.addAddress('demo-atelier', draft, controller.signal), { name: 'AbortError' });
  await assert.rejects(source.updateAddress('demo-atelier', addressId, draft, controller.signal), { name: 'AbortError' });
  assert.deepEqual(await source.get('demo-atelier', signal()), before);
  assert.equal((await source.get('demo-persona', signal())).addresses.length, 0);
});

test('duplicate warnings ignore case and extra spacing and exclude the address being edited', async () => {
  const source = createPreviewCustomersSource();
  const saved = await source.addAddress('demo-persona', draft, signal());
  assert.equal(hasDuplicateAddress(saved.addresses, { ...draft, street: ' CALLE   NUEVA ' }), true);
  assert.equal(hasDuplicateAddress(saved.addresses, draft, saved.addresses[0].id), false);
  assert.equal(hasDuplicateAddress(saved.addresses, { ...draft, number: '12' }), false);
});
