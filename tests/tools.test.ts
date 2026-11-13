import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runGetInventory, parseToolArgs } from '@/lib/ai/tools';
import type { InventoryItem } from '@/types/echo';

const items: InventoryItem[] = [
  { id: '1', name: 'Water bottle', category: 'water', quantity: 3, unit: 'bottles', source: 'manual',
    updatedAt: 1, unitVolumeMl: 500, fillLevel: 'full', location: 'locker seven' },
  { id: '2', name: 'Beans', category: 'food', quantity: 2, unit: 'cans', source: 'manual', updatedAt: 1 },
];

test('runGetInventory totals and location', () => {
  const o = runGetInventory(items, {});
  assert.equal(o.totals.water_liters_spoken, '1.5 L');
  assert.equal(o.totals.water_liters, 1.5);
  assert.equal(o.items.length, 2);
  assert.equal(o.items[0].location, 'locker seven');
  assert.equal(o.items[0].liters, 1.5);
  assert.equal(o.items[1].location, null);
});

test('category filter filters items but totals cover all water', () => {
  const food = runGetInventory(items, { category: 'food' });
  assert.deepEqual(food.items.map((i) => i.name), ['Beans']);
  assert.equal(food.totals.water_liters_spoken, '1.5 L');
  assert.equal(runGetInventory(items, { category: null }).items.length, 2);
});

test('parseToolArgs tolerates bad input', () => {
  assert.deepEqual(parseToolArgs(undefined), {});
  assert.deepEqual(parseToolArgs('{bad'), {});
  assert.deepEqual(parseToolArgs('{"category":"water"}'), { category: 'water' });
});
