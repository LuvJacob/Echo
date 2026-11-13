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

test('water sizes: standard bottle 500 mL, gallon jug 3785 mL, label overrides', () => {
  const b = specFor({ kind: 'water_bottle', name: '', waterAppearance: 'clear', waterSize: 'standard', labelMl: null, confidence: 1 });
  assert.equal(b.unitVolumeMl, 500);
  assert.equal(b.name, 'Water bottle');
  const j = specFor({ kind: 'water_bottle', name: '', waterAppearance: 'clear', waterSize: 'gallon_jug', labelMl: null, confidence: 1 });
  assert.equal(j.unitVolumeMl, 3785);
  assert.equal(j.name, 'Gallon jug of water');
  const l = specFor({ kind: 'water_bottle', name: '', waterAppearance: 'clear', waterSize: 'standard', labelMl: 591, confidence: 1 });
  assert.equal(l.unitVolumeMl, 591);
});

import { similarItem } from '@/lib/inventory/live';
test('similar names count as the same item; different foods do not', () => {
  assert.ok(similarItem('Bag of red kidney beans', 'Red kidney beans'));
  assert.ok(similarItem('Water bottle', 'Water bottle'));
  assert.ok(!similarItem('Bread', 'Red kidney beans'));
  assert.ok(!similarItem('Canned food', 'Bandages'));
});
