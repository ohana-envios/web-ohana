import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectAssignment, planningPayload } from '../src/shipments/planning-draft.ts';

test('selection survives other pages and keeps its original concurrency snapshot', () => {
  const first = { id: 'one', code: 'OH-1', recipientName: 'Ana', assignedCourierId: null, plannedFor: null };
  const second = { id: 'two', code: 'OH-2', recipientName: 'Luis', assignedCourierId: 'old', plannedFor: '2026-11-22T00:00:00.000Z' };
  let draft = selectAssignment({}, first, { id: 'a', displayName: 'Ada' });
  draft = selectAssignment(draft, second, { id: 'b', displayName: 'Bea' });
  draft = selectAssignment(draft, { ...first, assignedCourierId: 'changed' }, { id: 'b', displayName: 'Bea' });
  assert.equal(draft.one.expectedCourierId, null);
  assert.deepEqual(planningPayload(draft), [{ id: 'one', courierId: 'b', expectedCourierId: null, expectedPlannedFor: null }, { id: 'two', courierId: 'b', expectedCourierId: 'old', expectedPlannedFor: '2026-11-22' }]);
  assert.deepEqual(Object.keys(selectAssignment(draft, first, null)), ['two']);
});
test('limits a single confirmation to fifty shipments', () => {
  let draft = {};
  for (let i = 0; i < 50; i++) draft = selectAssignment(draft, { id: String(i), code: String(i), recipientName: 'A', assignedCourierId: null, plannedFor: null }, { id: 'c', displayName: 'C' });
  assert.throws(() => selectAssignment(draft, { id: '50', code: '50', recipientName: 'A', assignedCourierId: null, plannedFor: null }, { id: 'c', displayName: 'C' }));
});
