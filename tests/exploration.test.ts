import assert from 'node:assert/strict';
import test from 'node:test';
import type { Dot } from '../src/domain/model.ts';
import { matchesHighlights } from '../src/story/highlights.ts';
import config from '../story.config.ts';
import { sharedAnswer, summarizeGaps } from '../src/story/takeaway.ts';
import { ess11Source } from '../src/ess/source.ts';
import { prepareStory } from '../src/domain/prepareStory.ts';

test('a highlight matches only the selected country or recorded profile value', () => {
  const dot = {
    id: '42', country: 'EE', score: 3, answers: { q: 'b' }, profile: { gender: 'women', age: '30-44' },
  } satisfies Dot;
  assert.ok(matchesHighlights(dot, { key: 'country', value: 'EE' }));
  assert.ok(matchesHighlights(dot, { key: 'gender', value: 'women' }));
  assert.ok(!matchesHighlights(dot, { key: 'age', value: '15-29' }));
  assert.ok(!matchesHighlights(dot, { key: 'religiosity', value: 'high' }));
  assert.ok(!matchesHighlights({ ...dot, country: 'FI' }, { key: 'country', value: 'EE' }));
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

test('the takeaway covers all configured questions and shows the spread in group differences', async () => {
  const story = await prepareStory(await ess11Source(), config);

  const gaps = summarizeGaps(story.questions);
  assert.equal(gaps?.comparableCount, 6);
  assert.equal(gaps?.sharedMajorityCount, 5);
  assert.equal(gaps?.min.toFixed(1), '3.0');
  assert.equal(gaps?.max.toFixed(1), '27.7');
  assert.equal(summarizeGaps([]), null);
  assert.deepEqual(story.questions.map(question => question.correlation?.toFixed(2)), [
    '-0.19', '-0.29', '-0.15', '-0.30', '-0.29', '0.03',
  ]);
});
