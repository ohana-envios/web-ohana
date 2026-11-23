import assert from 'node:assert/strict';
import { test } from 'node:test';
import { directShipmentCode } from '../src/shipments/code-search.ts';

test('opens only complete shipment codes without additional filters', () => {
  const filters = { code: ' oh-12345678-1234-1234-1234-123456789abc ', customer: '', recipient: '', responsible: '', status: '', priority: '', from: '', to: '' };
  assert.equal(directShipmentCode(filters), filters.code.trim());
  assert.equal(directShipmentCode({ ...filters, code: 'OH-123456ABCDEF' }), 'OH-123456ABCDEF');
  assert.equal(directShipmentCode({ ...filters, recipient: 'Ana' }), null);
  assert.equal(directShipmentCode({ ...filters, code: 'OH-123' }), null);
});
