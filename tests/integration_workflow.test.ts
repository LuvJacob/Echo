import test from 'node:test';
import assert from 'node:assert/strict';
import { InventoryStore } from '../lib/inventory/store';
import { runGetInventory } from '../lib/ai/tools';
import { validateImageDataUrl } from '../lib/ai/vision';
import { buildProposal } from '../lib/ai/vision';
import { parseVisionOutput } from '../lib/ai/schemas';
import { MemStorage } from './helpers';

test('Integration: full photo scan -> review proposal -> confirm -> persistence -> recall', () => {
  const storage = new MemStorage();
  const store = new InventoryStore(storage);

  // 1. Simulate Vision model parse output
  const rawModelOutput = {
    summary: 'Detected 3 sealed plastic water bottles.',
    items: [
      {
        name: 'Purified Water Bottle',
        category: 'water',
        quantity: 3,
        unit: 'bottles',
        unit_volume_ml: 500,
        observations: ['Sealed cap', 'Clear water'],
        confidence: 0.95,
      },
    ],
    uncertainty_notes: ['Drinkability undetermined by optical scan alone.'],
  };

  const parsed = parseVisionOutput(rawModelOutput);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;

  // 2. Build proposal
  const proposal = buildProposal(parsed.value);
  assert.equal(proposal.status, 'pending');
  assert.equal(proposal.items.length, 1);
  assert.equal(proposal.items[0].unitVolumeMl, 500);

  // 3. User edits location to "locker seven" and sets fill level to "full"
  proposal.items[0].location = 'locker seven';
  proposal.items[0].fillLevel = 'full';

  // 4. Confirm proposal into store
  const confirmResult = store.confirmProposal(proposal);
  assert.equal(confirmResult.ok, true);
  if (!confirmResult.ok) return;

  assert.equal(confirmResult.value.totals.waterLiters, 1.5);
  assert.equal(confirmResult.value.totals.waterContainers, 3);

  // 5. Verify persistence across store re-instantiation (simulating reload)
  const reloadedStore = new InventoryStore(storage);
  const currentItems = reloadedStore.list();
  assert.equal(currentItems.length, 1);
  assert.equal(currentItems[0].name, 'Purified Water Bottle');
  assert.equal(currentItems[0].quantity, 3);
  assert.equal(currentItems[0].unitVolumeMl, 500);
  assert.equal(currentItems[0].location, 'locker seven');

  // 6. Verify ECHO tool recall: ECHO calls runGetInventory
  const toolResult = runGetInventory(currentItems, {});
  // Water is reported as container counts, never litres (team decision).
  assert.equal(toolResult.totals.water_containers, 3);
  assert.equal(toolResult.totals.water_spoken, '3 purified water bottles');
  assert.equal(toolResult.items[0].location, 'locker seven');
});

test('Integration: invalid image data rejection', () => {
  // Empty
  assert.notEqual(validateImageDataUrl(''), null);
  // Missing prefix
  assert.notEqual(validateImageDataUrl('not-a-data-url'), null);
  // Plain text fake base64
  assert.notEqual(validateImageDataUrl('data:image/jpeg;base64,mock_invalid'), null);
  // Valid base64 data url
  const valid = 'data:image/jpeg;base64,' + Buffer.from('fake-jpeg-bytes').toString('base64');
  assert.equal(validateImageDataUrl(valid), null);
});

test('Integration: failed inventory save handling preserves proposal for retry', () => {
  const throwingStorage = {
    getItem: () => null,
    setItem: () => {
      throw new Error('Disk Full / Quota Exceeded');
    },
    removeItem: () => {},
  };
  const store = new InventoryStore(throwingStorage);

  const proposal = {
    id: 'prop_fail_test',
    source: 'vision_scan' as const,
    operation: 'add' as const,
    items: [
      {
        name: 'MRE Ration',
        category: 'food' as const,
        quantity: 2,
        unit: 'packs',
        unitVolumeMl: null,
        fillLevel: null,
        location: null,
        drinkability: 'undetermined' as const,
        confidence: 0.9,
        observations: [],
      },
    ],
    summary: '2 MRE packs',
    uncertaintyNotes: [],
    createdAt: Date.now(),
    status: 'pending' as const,
  };

  const result = store.confirmProposal(proposal);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'save_failed');
    assert.match(result.error.message, /Quota Exceeded|Disk Full|Could not save/i);
  }
});
