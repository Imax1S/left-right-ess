import assert from 'node:assert/strict';
import test from 'node:test';
import { createSessionReducer, initialSession } from '../src/story/session.ts';

const reduce = createSessionReducer(['inequality', 'freedom'], ['EE', 'FR']);

test('country highlighting belongs exclusively to the placement step', () => {
  const scale = reduce(initialSession, { type: 'place', score: 8 });
  const among = reduce(scale, { type: 'confirm' });
  const highlighted = reduce(among, { type: 'country', code: 'EE' });
  assert.deepEqual(highlighted, { step: 'among', score: 8, country: 'EE', filters: {} });
  const question = reduce(highlighted, { type: 'start' });
  assert.deepEqual(question, { step: 'question', score: 8, index: 0 });
  assert.deepEqual(reduce(question, { type: 'country', code: 'FR' }), question);
  assert.deepEqual(reduce(question, { type: 'back' }), { step: 'among', score: 8, country: null, filters: {} });
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
  assert.equal(reduce(among, { type: 'country', code: 'US' }), among);
});

test('starts with the reader outside the arc and requires an explicit position', () => {
  assert.deepEqual(initialSession, { step: 'scale', score: null });
  assert.equal(reduce(initialSession, { type: 'confirm' }), initialSession);
  const placed = reduce(initialSession, { type: 'place', score: 7 });
  assert.deepEqual(reduce(placed, { type: 'confirm' }), { step: 'among', score: 7, country: null, filters: {} });
});

test('profile filters combine on placement and clear on leaving the step', () => {
  const placed = reduce(initialSession, { type: 'place', score: 7 });
  const among = reduce(placed, { type: 'confirm' });
  const byGender = reduce(among, { type: 'filter', key: 'gender', value: 'women' });
  const byAge = reduce(byGender, { type: 'filter', key: 'age', value: '30-44' });
  assert.deepEqual(byAge, { step: 'among', score: 7, country: null, filters: { gender: 'women', age: '30-44' } });
  assert.deepEqual(reduce(byAge, { type: 'filter', key: 'gender', value: null }), {
    step: 'among', score: 7, country: null, filters: { age: '30-44' },
  });
  const question = reduce(byAge, { type: 'start' });
  assert.deepEqual(question, { step: 'question', score: 7, index: 0 });
  assert.deepEqual(reduce(question, { type: 'back' }), { step: 'among', score: 7, country: null, filters: {} });
});
