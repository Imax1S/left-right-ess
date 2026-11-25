import assert from 'node:assert/strict';
import test from 'node:test';
import type { Dot } from '../src/domain/model.ts';
import { matchesHighlights } from '../src/story/highlights.ts';
import { sharedAnswer } from '../src/story/takeaway.ts';
import { ess11Source } from '../src/ess/source.ts';
import { prepareStory } from '../src/domain/prepareStory.ts';

const matches = (dot: Dot, filters: Parameters<typeof matchesHighlights>[2]) =>
  matchesHighlights(dot, 'EE', filters);

test('country and profile filters intersect and missing profile values stay unknown', () => {
  const dot = {
    id: '42', country: 'EE', score: 3, answers: { q: 'b' }, profile: { gender: 'women', age: '30-44' },
  } satisfies Dot;
  assert.ok(matches(dot, { gender: 'women', age: '30-44' }));
  assert.ok(matches(dot, {}));
  assert.ok(!matches(dot, { gender: 'women', age: '15-29' }));
  assert.ok(!matches(dot, { religiosity: 'high' }));
  assert.ok(!matches({ ...dot, country: 'FI' }, {}));
});

test('published dots carry the categorical ESS profile and the takeaway uses genuine shared answers', async () => {
  const source = await ess11Source();
  const story = await prepareStory(source, {
    questions: ['inequality', 'freedom'], countries: source.countryCodes, dotCount: 100,
  });
  const profileKeys = new Set(story.dots.flatMap(dot => Object.keys(dot.profile ?? {})));
  assert.deepEqual([...profileKeys].sort(), ['age', 'education', 'gender', 'religiosity']);

  const example = sharedAnswer(story.questions);
  assert.equal(example?.question.id, 'freedom');
  assert.equal(example?.choice, 'a');
  assert.equal(example?.left.toFixed(1), '95.4');
  assert.equal(example?.right.toFixed(1), '87.2');
  assert.equal(sharedAnswer([]), null);
});
