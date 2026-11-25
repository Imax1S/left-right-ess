import assert from 'node:assert/strict';
import test from 'node:test';
import type { StoryQuestion } from '../src/domain/model.ts';
import { answerAlignment } from '../src/story/answerAlignment.ts';
import { ess11Source } from '../src/ess/source.ts';
import { prepareStory } from '../src/domain/prepareStory.ts';

test('uses weighted ESS rates to cross from the right for redistribution, then the left for low trust', async () => {
  const source = await ess11Source();
  const data = await prepareStory(source, {
    questions: ['inequality', 'parliament'], countries: source.countryCodes, dotCount: 100,
  });
  const [inequality, parliament] = data.questions;

  assert.deepEqual(answerAlignment(inequality.stats, 'a', 8), { side: 'left', score: 2, gap: 13.9 });
  assert.deepEqual(answerAlignment(inequality.stats, 'b', 8), { side: 'right', score: 8, gap: 13.9 });
  assert.deepEqual(answerAlignment(parliament.stats, 'a', 2), { side: 'right', score: 8, gap: 2.9 });
  assert.deepEqual(answerAlignment(parliament.stats, 'b', 8), { side: 'left', score: 2, gap: 2.9 });
});

test('keeps the starting mark for equal displayed rates and when a comparison is unavailable', () => {
  for (const percent of [50.04, null]) {
    const share = { count: 1, total: 2, percent: 50.02 };
    const stats: StoryQuestion['stats'] = {
      left: { a: share, b: share },
      right: { a: { ...share, percent }, b: share },
    };
    assert.deepEqual(answerAlignment(stats, 'a', 7), { side: null, score: 7, gap: percent === null ? null : 0 });
  }
});
