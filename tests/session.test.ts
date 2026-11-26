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
  assert.deepEqual(question, { step: 'question', score: 8, index: 0, answers: {} });
  assert.deepEqual(reduce(question, { type: 'filter', selection: { key: 'country', value: 'FR' } }), question);
  assert.deepEqual(reduce(question, { type: 'back' }), { step: 'among', score: 8, highlight: null });
});

test('question count controls advancement and restart clears the session', () => {
  const question = { step: 'question', score: 5, index: 0, answers: {} } as const;
  const first = reduce(question, { type: 'answer', option: 'neutral' });
  assert.deepEqual(first, { step: 'result', score: 5, index: 0, option: 'neutral', answers: { 0: 'neutral' } });
  const next = reduce(first, { type: 'next' });
  assert.deepEqual(next, { step: 'question', score: 5, index: 1, answers: { 0: 'neutral' } });
  const final = reduce(next, { type: 'answer', option: 'b' });
  const conclusion = reduce(final, { type: 'next' });
  assert.deepEqual(conclusion, { step: 'conclusion', score: 5, answers: { 0: 'neutral', 1: 'b' } });
  assert.deepEqual(reduce(conclusion, { type: 'back' }), final);
  const revisited = reduce(reduce(final, { type: 'back' }), { type: 'back' });
  const edited = reduce(revisited, { type: 'answer', option: 'a' });
  assert.ok('answers' in edited);
  assert.deepEqual(edited.answers, { 0: 'a', 1: 'b' });
  assert.deepEqual(reduce(conclusion, { type: 'restart' }), initialSession);
});

test('centre is available and out-of-scope country is rejected', () => {
  assert.deepEqual(reduce(initialSession, { type: 'place', score: 5 }), { step: 'scale', score: 5 });
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
  assert.deepEqual(question, { step: 'question', score: 7, index: 0, answers: {} });
  assert.deepEqual(reduce(question, { type: 'back' }), among);
});

test('the second act leads from the vote result to understanding and supports back navigation', () => {
  const act = createSessionReducer(['inequality', 'migration', 'adoption', 'climate', 'vote', 'understanding'], [], true);
  const vote = { step: 'result', score: 8, index: 4, option: 'b', answers: { 0: 'neutral', 1: 'a', 4: 'b' } } as const;
  const engagement = act(vote, { type: 'next' });
  assert.deepEqual(engagement, { step: 'engagement', score: 8, answers: vote.answers });
  assert.deepEqual(act(engagement, { type: 'back' }), vote);
  const quadrant = act(engagement, { type: 'next' });
  assert.deepEqual(quadrant, { step: 'quadrant', score: 8, answers: vote.answers });
  assert.deepEqual(act(quadrant, { type: 'back' }), engagement);
  const understanding = act(quadrant, { type: 'next' });
  assert.deepEqual(understanding, { step: 'question', score: 8, index: 5, answers: vote.answers });
  assert.deepEqual(act(understanding, { type: 'back' }), quadrant);
  const result = act(understanding, { type: 'answer', option: 'a' });
  assert.deepEqual(act(result, { type: 'next' }), {
    step: 'conclusion', score: 8, answers: { ...vote.answers, 5: 'a' },
  });
});
