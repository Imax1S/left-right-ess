import assert from 'node:assert/strict';
import test from 'node:test';
import { answerAlignment } from '../src/story/answerAlignment.ts';
import { ess11Source } from '../src/ess/source.ts';
import { prepareStory } from '../src/domain/prepareStory.ts';

test('moves toward the political group where an answer is most common, including the centre', async () => {
  const source = await ess11Source();
  const data = await prepareStory(source, {
    questions: ['inequality', 'parliament'], countries: source.countryCodes, dotCount: 100,
  });
  const [inequality, parliament] = data.questions;
  assert.deepEqual(answerAlignment(inequality.stats, 'a', 8), { side: 'left', score: 2, gap: 17.2 });
  assert.deepEqual(answerAlignment(inequality.stats, 'b', 8), { side: 'right', score: 8, gap: 10.5 });
  assert.deepEqual(answerAlignment(inequality.stats, 'neutral', 2), { side: 'right', score: 8, gap: 6.7 });
  assert.deepEqual(answerAlignment(inequality.stats, 'a', 5), { side: 'left', score: 3, gap: 17.2 });
  assert.deepEqual(answerAlignment(parliament.stats, 'a', 2), { side: 'centre', score: 5, gap: 8.2 });
});

test('keeps the starting mark if the leading shares are tied or a comparison is unavailable', () => {
  const share = (percent: number | null) => ({ count: 1, total: 2, percent });
  const row = (percent: number | null) => ({ a: share(percent), b: share(null), neutral: share(null) });
  for (const [stats, gap] of [
    [{ left: row(50.02), centre: row(50.04), right: row(30) }, 20],
    [{ left: row(50.02), centre: row(null), right: row(null) }, null],
  ] as const) {
    assert.deepEqual(answerAlignment(stats, 'a', 7), { side: null, score: 7, gap });
  }
});
