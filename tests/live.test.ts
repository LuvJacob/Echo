import { test } from 'node:test';
import assert from 'node:assert/strict';
import { confirmationPhrase, specFor, waterSafetyFor } from '@/lib/inventory/live';

test('water safety: cloudy → possible contamination, even if sealed', () => {
  assert.equal(waterSafetyFor('cloudy_or_discolored', true), 'possible_contamination');
});
test('water safety: clear + unknown source → safety unknown', () => {
  assert.equal(waterSafetyFor('clear', false), 'safety_unknown');
});
test('water safety: clear + user-confirmed sealed → preferred', () => {
  assert.equal(waterSafetyFor('clear', true), 'preferred');
});
test('categories: water/rations/medical, other first-aid goes to medical', () => {
  assert.deepEqual(specFor({ kind: 'water_bottle', name: '', waterAppearance: 'clear', confidence: 1 }).category, 'water');
  assert.equal(specFor({ kind: 'canned_food', name: '', waterAppearance: 'not_applicable', confidence: 1 }).name, 'Canned food');
  assert.equal(specFor({ kind: 'bandages', name: '', waterAppearance: 'not_applicable', confidence: 1 }).category, 'medical');
  const gauze = specFor({ kind: 'first_aid_other', name: 'gauze pads', waterAppearance: 'not_applicable', confidence: 1 });
  assert.equal(gauze.category, 'medical');
  assert.equal(gauze.name, 'Gauze pads');
});
test('spoken confirmations', () => {
  const base = { id: 'x', at: 0 };
  assert.equal(confirmationPhrase({ ...base, name: 'Water bottle', categoryLabel: 'Water', waterSafety: 'safety_unknown' }), 'Water bottle added.');
  assert.equal(confirmationPhrase({ ...base, name: 'Canned food', categoryLabel: 'Rations' }), 'Canned food added to rations.');
  assert.equal(confirmationPhrase({ ...base, name: 'Bandages', categoryLabel: 'Medical supplies' }), 'Bandages added to medical supplies.');
});
