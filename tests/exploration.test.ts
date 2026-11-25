import assert from 'node:assert/strict';
import test from 'node:test';
import type { Dot } from '../src/domain/model.ts';
import { matchesHighlights } from '../src/story/highlights.ts';
import config from '../story.config.ts';
import { takeawayExamples } from '../src/story/takeaway.ts';
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

  const { agreement: example } = takeawayExamples(story.questions);
  assert.equal(example?.question.id, 'freedom');
  assert.equal(example?.choice, 'a');
  assert.equal(example?.question.stats.left.a.percent?.toFixed(1), '89.4');
  assert.equal(example?.question.stats.centre.a.percent?.toFixed(1), '82.4');
  assert.equal(example?.question.stats.right.a.percent?.toFixed(1), '76.9');
});

test('the takeaway shows both shared agreement and the widest gap', async () => {
  const story = await prepareStory(await ess11Source(), config);
  const { agreement, widest } = takeawayExamples(story.questions);
  assert.equal(agreement?.question.id, 'freedom');
  assert.equal(widest?.question.id, 'migration');
  assert.equal(widest?.choice, 'a');
  assert.equal(widest?.question.options.neutral, undefined);
  assert.deepEqual(takeawayExamples([]), { agreement: null, widest: null });
  assert.deepEqual(story.questions.map(question => question.association?.toFixed(2)), [
    '0.12', '0.24', '0.10', '0.17', '0.14', '0.07',
  ]);
});
