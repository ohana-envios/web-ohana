import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPreviewCustomersSource } from '../src/customers/preview-source.ts';

const signal = () => new AbortController().signal;
const query = { search: 'Atelier', status: 'all', page: 1, pageSize: 20 };

test('deactivating a preview customer retains the record and addresses and updates status filters', async () => {
  const source = createPreviewCustomersSource();
  const before = await source.get('demo-atelier', signal());
  const saved = await source.deactivateCustomer('demo-atelier', signal());
  assert.deepEqual(saved, { ...before, enabled: false });
  assert.equal((await source.list({ ...query, status: 'enabled' }, signal())).total, 0);
  assert.equal((await source.list({ ...query, status: 'disabled' }, signal())).total, 1);
  assert.deepEqual(await source.deactivateCustomer('demo-atelier', signal()), saved);
  assert.equal((await createPreviewCustomersSource().get('demo-atelier', signal())).enabled, true);
});

test('deactivating an address keeps its data and total count with separate preview metadata', async () => {
  const source = createPreviewCustomersSource();
  const before = await source.get('demo-atelier', signal());
  const addressId = before.addresses[0].id;
  const saved = await source.deactivateAddress('demo-atelier', addressId, signal());
  assert.deepEqual(saved.addresses, before.addresses);
  assert.equal(saved.addressCount, before.addressCount);
  assert.equal(saved.enabled, true);
  assert.deepEqual(saved.preview.inactiveAddressIds, [addressId]);
  assert.deepEqual(await source.deactivateAddress('demo-atelier', addressId, signal()), saved);
  const edited = await source.updateAddress('demo-atelier', addressId, {
    label: 'Etiqueta nueva', street: 'Calle', number: '123', locality: 'Centro', department: 'Montevideo', reference: '', notes: '',
  }, signal());
  assert.deepEqual(edited.preview.inactiveAddressIds, [addressId]);
});

test('cross-customer, missing and cancelled deactivations cannot change records', async () => {
  const source = createPreviewCustomersSource();
  const before = await source.get('demo-atelier', signal());
  const other = await source.get('demo-persona', signal());
  await assert.rejects(source.deactivateAddress('demo-persona', before.addresses[0].id, signal()));
  await assert.rejects(source.deactivateAddress('demo-atelier', 'missing', signal()));
  await assert.rejects(source.deactivateCustomer('missing', signal()));
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(source.deactivateCustomer('demo-atelier', controller.signal), { name: 'AbortError' });
  await assert.rejects(source.deactivateAddress('demo-atelier', before.addresses[0].id, controller.signal), { name: 'AbortError' });
  assert.deepEqual(await source.get('demo-atelier', signal()), before);
  assert.deepEqual(await source.get('demo-persona', signal()), other);
});

test('reactivating a customer restores list membership without reactivating its addresses', async () => {
  const source = createPreviewCustomersSource();
  const before = await source.get('demo-atelier', signal());
  await source.deactivateAddress('demo-atelier', before.addresses[0].id, signal());
  const inactive = await source.deactivateCustomer('demo-atelier', signal());
  const restored = await source.reactivateCustomer('demo-atelier', signal());
  assert.deepEqual(restored, { ...inactive, enabled: true });
  assert.equal((await source.list({ ...query, status: 'enabled' }, signal())).total, 1);
  assert.equal((await source.list({ ...query, status: 'disabled' }, signal())).total, 0);
  assert.deepEqual(await source.reactivateCustomer('demo-atelier', signal()), restored);
});

test('reactivating an address preserves other inactive addresses and does not enable its customer', async () => {
  const source = createPreviewCustomersSource();
  const before = await source.get('demo-atelier', signal());
  const [first, second] = before.addresses;
  await source.deactivateAddress('demo-atelier', first.id, signal());
  await source.deactivateAddress('demo-atelier', second.id, signal());
  await source.deactivateCustomer('demo-atelier', signal());
  const restored = await source.reactivateAddress('demo-atelier', first.id, signal());
  assert.equal(restored.enabled, false);
  assert.deepEqual(restored.preview.inactiveAddressIds, [second.id]);
  assert.deepEqual(restored.addresses, before.addresses);
  assert.deepEqual(await source.reactivateAddress('demo-atelier', first.id, signal()), restored);
});

test('missing, cross-customer and cancelled reactivations leave the customer unchanged', async () => {
  const source = createPreviewCustomersSource();
  await source.deactivateAddress('demo-atelier', 'demo-address-1', signal());
  const before = await source.deactivateCustomer('demo-atelier', signal());
  await assert.rejects(source.reactivateCustomer('missing', signal()));
  await assert.rejects(source.reactivateAddress('demo-persona', 'demo-address-1', signal()));
  await assert.rejects(source.reactivateAddress('demo-atelier', 'missing', signal()));
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(source.reactivateCustomer('demo-atelier', controller.signal), { name: 'AbortError' });
  await assert.rejects(source.reactivateAddress('demo-atelier', 'demo-address-1', controller.signal), { name: 'AbortError' });
  assert.deepEqual(await source.get('demo-atelier', signal()), before);
});
