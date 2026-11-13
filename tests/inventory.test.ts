import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InventoryStore, INVENTORY_KEY, LEGACY_INVENTORY_KEY } from '@/lib/inventory/store';
import { computeTotals, formatLiters } from '@/lib/inventory/totals';
import type { InventoryItem } from '@/types/echo';
import { MemStorage, proposal, water } from './helpers';

test('confirmProposal: 3x500mL full = 1.5 L and persists across reload', () => {
  const st = new MemStorage();
  const r = new InventoryStore(st).confirmProposal(proposal('p1'));
  assert.ok(r.ok);
  assert.equal(r.value.duplicate, false);
  assert.equal(r.value.totals.waterLiters, 1.5);
  const items = new InventoryStore(st).list();
  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 3);
  assert.equal(items[0].location, 'locker seven');
  assert.equal(computeTotals(items).waterLiters, 1.5);
});

test('confirming same proposal twice is idempotent', () => {
  const st = new MemStorage();
  const s = new InventoryStore(st);
  const a = s.confirmProposal(proposal('p1'));
  const b = s.confirmProposal(proposal('p1'));
  assert.ok(a.ok && b.ok);
  assert.equal(b.value.duplicate, true);
  assert.deepEqual(b.value.itemIds, a.value.itemIds);
  assert.equal(b.value.totals.waterLiters, 1.5);
  const items = new InventoryStore(st).list();
  assert.equal(items[0].quantity, 3);
  assert.equal(computeTotals(items).waterLiters, 1.5);
});

test('setItem throwing (quota) -> save_failed, store unchanged', () => {
  const st = new MemStorage();
  const s = new InventoryStore(st);
  assert.ok(s.confirmProposal(proposal('p1')).ok);
  const before = st.data.get(INVENTORY_KEY);
  st.setItem = () => { throw new Error('QuotaExceededError'); };
  const r = s.confirmProposal(proposal('p2', [water({ name: 'Other', quantity: 2 })]));
  assert.ok(!r.ok);
  assert.equal(r.error.code, 'save_failed');
  assert.equal(st.data.get(INVENTORY_KEY), before);
  assert.equal(s.list().length, 1);
});

test('failed first save leaves store empty', () => {
  const st = new MemStorage();
  st.setItem = () => { throw new Error('disabled'); };
  const r = new InventoryStore(st).confirmProposal(proposal('p1'));
  assert.ok(!r.ok);
  assert.equal(r.error.code, 'save_failed');
  assert.equal(st.data.size, 0);
  assert.equal(new InventoryStore(st).list().length, 0);
});

test('read-back mismatch -> save_failed', () => {
  const st = new MemStorage();
  const realGet = st.getItem.bind(st);
  st.getItem = (k) => {
    const v = realGet(k);
    return k === INVENTORY_KEY && v ? v + ' ' : v;
  };
  const r = new InventoryStore(st).confirmProposal(proposal('p1'));
  assert.ok(!r.ok);
  assert.equal(r.error.code, 'save_failed');
});

test('invalid items rejected with invalid_request, nothing written', () => {
  const bad = [
    water({ quantity: 0 }),
    water({ name: '   ' }),
    water({ unitVolumeMl: -5 }),
  ];
  for (const b of bad) {
    const st = new MemStorage();
    const r = new InventoryStore(st).confirmProposal(proposal('p', [b]));
    assert.ok(!r.ok);
    assert.equal(r.error.code, 'invalid_request');
    assert.equal(st.data.size, 0);
  }
});

test('rejecting (never calling confirm) leaves inventory untouched', () => {
  const st = new MemStorage();
  const s = new InventoryStore(st);
  proposal('p1'); // proposal exists but is never confirmed
  assert.equal(s.list().length, 0);
  assert.equal(st.data.size, 0);
});

test('unknown fill or volume excluded from liters, counted as unknown', () => {
  const st = new MemStorage();
  const s = new InventoryStore(st);
  const r = s.confirmProposal(proposal('p1', [
    water({ name: 'A', quantity: 2, fillLevel: null }),
    water({ name: 'B', quantity: 4, unitVolumeMl: null }),
    water({ name: 'C', quantity: 1 }),
  ]));
  assert.ok(r.ok);
  assert.equal(r.value.totals.waterLiters, 0.5);
  assert.equal(r.value.totals.waterContainersUnknownVolume, 6);
  assert.equal(r.value.totals.waterContainers, 7);
});

test('legacy v1 array is read', () => {
  const st = new MemStorage();
  const legacy: InventoryItem[] = [{
    id: 'x', name: 'Old', category: 'water', quantity: 2, unit: 'bottles',
    source: 'manual', updatedAt: 1, unitVolumeMl: 1000, fillLevel: 'full',
  }];
  st.data.set(LEGACY_INVENTORY_KEY, JSON.stringify(legacy));
  const s = new InventoryStore(st);
  assert.equal(s.list().length, 1);
  assert.equal(computeTotals(s.list()).waterLiters, 2);
});

test('applyAction with same proposalId applies once', () => {
  const st = new MemStorage();
  const s = new InventoryStore(st);
  const action = {
    type: 'inventory_update' as const, operation: 'add' as const, proposalId: 'a1',
    item: { name: 'Beans', category: 'food' as const, quantity: 2, unit: 'cans', source: 'manual' as const },
  };
  assert.ok(s.applyAction(action).ok);
  assert.ok(s.applyAction(action).ok);
  const items = s.list();
  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 2);
});

test('merge: same key merges, different location makes two lines', () => {
  const st = new MemStorage();
  const s = new InventoryStore(st);
  assert.ok(s.confirmProposal(proposal('p1', [water({ quantity: 3 })])).ok);
  assert.ok(s.confirmProposal(proposal('p2', [water({ quantity: 2 })])).ok);
  assert.equal(s.list().length, 1);
  assert.equal(s.list()[0].quantity, 5);
  assert.ok(s.confirmProposal(proposal('p3', [water({ quantity: 1, location: 'shed' })])).ok);
  assert.equal(s.list().length, 2);
});

test('formatLiters', () => {
  assert.equal(formatLiters(0.5), '500 mL');
  assert.equal(formatLiters(1.5), '1.5 L');
  assert.equal(formatLiters(0), '0 L');
});
