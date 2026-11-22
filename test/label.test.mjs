import { test } from 'node:test';
import assert from 'node:assert/strict';
import { labelHtml } from '../src/shipments/label.ts';
test('labels identify each package and escape all supplied content', () => {
  const html = labelHtml({ code: 'OH-CODE', recipientName: '<script>alert(1)</script>', street: 'Calle & otra', number: '1', locality: 'Ciudad', department: 'Montevideo', packageCount: 2 });
  assert.equal((html.match(/OH-CODE/g) ?? []).length, 2);
  assert.match(html, /Bulto 2 de 2/);
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('Calle &amp; otra'));
  assert.throws(() => labelHtml({ packageCount: 0 }));
});
