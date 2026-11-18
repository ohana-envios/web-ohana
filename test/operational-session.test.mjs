import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isCurrentAdministrator } from '../src/operational-session.ts';

test('administration requires the enabled administrator for the current token', () => {
  const admin = { id: 'u1', email: 'admin@example.invalid', displayName: 'Admin', role: 'ADMIN', enabled: true };
  assert.equal(isCurrentAdministrator('token', { token: 'token', user: admin }), true);
  assert.equal(isCurrentAdministrator(undefined, null), false);
  assert.equal(isCurrentAdministrator('new-token', { token: 'old-token', user: admin }), false);
  assert.equal(isCurrentAdministrator('token', { token: 'token', user: { ...admin, enabled: false } }), false);
  assert.equal(isCurrentAdministrator('token', { token: 'token', user: { ...admin, role: 'CUSTOMER' } }), false);
});
