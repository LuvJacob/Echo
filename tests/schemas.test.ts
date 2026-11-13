import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseVisionOutput, DRINKABILITY_NOTE } from '@/lib/ai/schemas';

const item = (over: Record<string, unknown> = {}) => ({
  name: 'Water bottle', category: 'water', quantity: 3, unit: 'bottles',
  unit_volume_ml: 500, observations: ['label legible'], confidence: 0.8, ...over,
});
const out = (items: unknown[] = [item()], extra: Record<string, unknown> = {}) => ({
  summary: 'Bottles', items, uncertainty_notes: [], ...extra,
});

test('valid output passes with nulls and undetermined drinkability', () => {
  const r = parseVisionOutput(out());
  assert.ok(r.ok);
  const it = r.value.items[0];
  assert.equal(it.fillLevel, null);
  assert.equal(it.location, null);
  assert.equal(it.drinkability, 'undetermined');
  assert.equal(it.quantity, 3);
  assert.equal(it.unitVolumeMl, 500);
});

test('accepts JSON string input and null volume', () => {
  const r = parseVisionOutput(JSON.stringify(out([item({ unit_volume_ml: null })])));
  assert.ok(r.ok);
  assert.equal(r.value.items[0].unitVolumeMl, null);
});

test('water adds DRINKABILITY_NOTE; non-water does not', () => {
  const w = parseVisionOutput(out());
  assert.ok(w.ok && w.value.uncertaintyNotes.includes(DRINKABILITY_NOTE));
  const f = parseVisionOutput(out([item({ category: 'food', name: 'Beans' })]));
  assert.ok(f.ok && !f.value.uncertaintyNotes.includes(DRINKABILITY_NOTE));
});

test('safety-verdict observation dropped, visual one kept', () => {
  const r = parseVisionOutput(out([item({ observations: ['water looks safe to drink', 'green tint'] })]));
  assert.ok(r.ok);
  assert.deepEqual(r.value.items[0].observations, ['green tint']);
});

const malformed: [string, unknown][] = [
  ['non-JSON string', 'not json {'],
  ['missing items', { summary: 's', uncertainty_notes: [] }],
  ['quantity 2.5', out([item({ quantity: 2.5 })])],
  ['quantity 0', out([item({ quantity: 0 })])],
  ['category banana', out([item({ category: 'banana' })])],
  ['negative volume', out([item({ unit_volume_ml: -5 })])],
  ['confidence 3', out([item({ confidence: 3 })])],
  ['observations not array', out([item({ observations: 'x' })])],
  ['array instead of object', []],
  ['null', null],
  ['number', 42],
];
for (const [name, input] of malformed) {
  test(`malformed: ${name} -> invalid_model_output`, () => {
    const r = parseVisionOutput(input);
    assert.ok(!r.ok);
    assert.equal(r.error.code, 'invalid_model_output');
  });
}
