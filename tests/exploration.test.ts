import assert from 'node:assert/strict';
import test from 'node:test';
import type { Dot } from '../src/domain/model.ts';
import { matchesHighlights } from '../src/story/highlights.ts';
import config from '../story.config.ts';
import { groupMatch, takeawayExamples } from '../src/story/takeaway.ts';
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
  assert.equal(agreement?.question.id, 'understanding');
  assert.equal(widest?.question.id, 'migration');
  assert.equal(widest?.choice, 'a');
  assert.equal(widest?.question.options.neutral, undefined);
  assert.deepEqual(takeawayExamples([]), { agreement: null, widest: null });
  assert.deepEqual(story.questions.map(question => question.association?.toFixed(2)), [
    '0.12', '0.24', '0.17', '0.14', '0.14', '0.06',
  ]);
});

test('a personal result counts the most common answer in the original group for each answered question', async () => {
  const story = await prepareStory(await ess11Source(), config);
  const answers = { 0: 'a', 1: 'a', 2: 'a', 3: 'neutral', 4: 'b', 5: 'a' } as const;
  assert.deepEqual(groupMatch(story.questions, 5, answers), { matches: 5, compared: 6 });
  assert.deepEqual(groupMatch(story.questions, 4, answers), { matches: 4, compared: 6 });
  assert.deepEqual(groupMatch(story.questions, 5, { 0: 'neutral' }), { matches: 0, compared: 1 });
  assert.deepEqual(groupMatch(story.questions, 5, {}), { matches: 0, compared: 0 });
});

test('benchmarks a complete match and shared answer patterns using the full weighted ESS data', async () => {
  const story = await prepareStory(await ess11Source(), config);
  const profiles = story.responsePatterns;
  assert.ok(profiles);
  assert.equal(profiles.count, 29099);
  assert.equal(profiles.fullMatchPercent.toFixed(1), '13.3');
  assert.deepEqual(
    (['left', 'centre', 'right'] as const).map(side => profiles.fullMatchPercentByGroup[side]?.toFixed(1)),
    ['27.4', '7.4', '3.6'],
  );
  assert.equal(profiles.sharedAcrossGroupsPercent?.toFixed(1), '99.4');
  assert.notEqual(profiles.count, story.dots.length);
});
