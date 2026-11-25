import assert from 'node:assert/strict';
import test from 'node:test';
import { createSessionReducer, initialSession } from '../src/story/session.ts';

const reduce = createSessionReducer(['inequality', 'freedom'], ['EE', 'FR']);

test('country highlighting belongs exclusively to the placement step', () => {
  const scale = reduce(initialSession, { type: 'place', score: 8 });
  const among = reduce(scale, { type: 'confirm' });
  const highlighted = reduce(among, { type: 'filter', selection: { key: 'country', value: 'EE' } });
  assert.deepEqual(highlighted, { step: 'among', score: 8, highlight: { key: 'country', value: 'EE' } });
  const question = reduce(highlighted, { type: 'start' });
  assert.deepEqual(question, { step: 'question', score: 8, index: 0 });
  assert.deepEqual(reduce(question, { type: 'filter', selection: { key: 'country', value: 'FR' } }), question);
  assert.deepEqual(reduce(question, { type: 'back' }), { step: 'among', score: 8, highlight: null });
});

test('question count controls advancement and restart clears the session', () => {
  const question = { step: 'question', score: 3, index: 0 } as const;
  const first = reduce(question, { type: 'answer', option: 'a' });
  assert.deepEqual(first, { step: 'result', score: 3, index: 0, option: 'a' });
  const next = reduce(first, { type: 'next' });
  assert.deepEqual(next, { step: 'question', score: 3, index: 1 });
  const final = reduce(next, { type: 'answer', option: 'b' });
  const conclusion = reduce(final, { type: 'next' });
  assert.deepEqual(conclusion, { step: 'conclusion', score: 3, lastAnswer: 'b' });
  assert.deepEqual(reduce(conclusion, { type: 'back' }), final);
  assert.deepEqual(reduce(conclusion, { type: 'restart' }), initialSession);
});

test('centre is unavailable and out-of-scope country is rejected', () => {
  assert.equal(reduce(initialSession, { type: 'place', score: 5 }), initialSession);
  const placed = reduce(initialSession, { type: 'place', score: 3 });
  const among = reduce(placed, { type: 'confirm' });
  assert.equal(reduce(among, { type: 'filter', selection: { key: 'country', value: 'US' } }), among);
});

test('starts with the reader outside the arc and requires an explicit position', () => {
  assert.deepEqual(initialSession, { step: 'scale', score: null });
  assert.equal(reduce(initialSession, { type: 'confirm' }), initialSession);
  const placed = reduce(initialSession, { type: 'place', score: 7 });
  assert.deepEqual(reduce(placed, { type: 'confirm' }), { step: 'among', score: 7, highlight: null });
});

test('each selection replaces the previous filter, including country', () => {
  const placed = reduce(initialSession, { type: 'place', score: 7 });
  const among = reduce(placed, { type: 'confirm' });
  const age = { key: 'age', value: '30-44' } as const;
  const country = { key: 'country', value: 'EE' } as const;
  const byGender = reduce(among, { type: 'filter', selection: { key: 'gender', value: 'women' } });
  const byAge = reduce(byGender, { type: 'filter', selection: age });
  assert.deepEqual(byAge, { step: 'among', score: 7, highlight: age });
  const byCountry = reduce(byAge, { type: 'filter', selection: country });
  assert.deepEqual(byCountry, { step: 'among', score: 7, highlight: country });
  assert.deepEqual(reduce(byCountry, { type: 'filter', selection: null }), among);
  const question = reduce(byCountry, { type: 'start' });
  assert.deepEqual(question, { step: 'question', score: 7, index: 0 });
  assert.deepEqual(reduce(question, { type: 'back' }), among);
});
