import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { InventoryItem } from '@/types/echo';
import { describeContainers, parseToolArgs, runGetInventory } from '@/lib/ai/tools';

const item = (o: Partial<InventoryItem>): InventoryItem => ({
  id: Math.random().toString(36), name: 'Water bottle', category: 'water', quantity: 1, unit: 'bottles',
  source: 'vision_scan', updatedAt: 1, ...o,
});

test('water is reported as container counts by type, never litres', () => {
  const o = runGetInventory(
    [
      item({ name: 'Water bottle', quantity: 3, unitVolumeMl: 500, fillLevel: 'full', location: 'locker seven' }),
      item({ name: 'Gallon jug of water', quantity: 1, unit: 'jugs', unitVolumeMl: 3785, fillLevel: 'full' }),
      item({ name: 'Water bottle', quantity: 1, waterSafety: 'possible_contamination' }),
      item({ name: 'Red kidney beans', category: 'food', unit: 'items' }),
    ],
    {}
  );
  assert.equal(o.totals.water_containers, 5);
  assert.equal(o.totals.water_spoken, '4 water bottles and 1 gallon jug of water');
  assert.equal(o.totals.unsafe_water_containers, 1);
  assert.equal(o.totals.rations_items, 1);
  assert.ok(!JSON.stringify(o).toLowerCase().includes('liter'), 'no litre fields in tool output');
  assert.equal(o.items[0].location, 'locker seven');
});

test('plurals read naturally', () => {
  assert.equal(describeContainers({ 'Gallon jug of water': 2 }), '2 gallon jugs of water');
  assert.equal(describeContainers({ 'Water bottle': 1 }), '1 water bottle');
  assert.equal(describeContainers({}), 'no water containers');
});

test('category filter keeps water totals', () => {
  const o = runGetInventory([item({ quantity: 2 }), item({ name: 'Bread', category: 'food' })], { category: 'food' });
  assert.equal(o.items.length, 1);
  assert.equal(o.totals.water_containers, 2);
});

test('parseToolArgs tolerates bad input', () => {
  assert.deepEqual(parseToolArgs(undefined), {});
  assert.deepEqual(parseToolArgs('{bad'), {});
});
