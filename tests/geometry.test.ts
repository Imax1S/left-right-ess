import assert from 'node:assert/strict';
import test from 'node:test';
import { arcLayout, answerLayout, resultHeight, viewBox } from '../src/visualization/geometry.ts';
import { scores } from '../src/domain/model.ts';

test('arc and all answer bands keep people in bounds without overlap', () => {
  const dots = Array.from({ length: 200 }, (_, id) => ({
    id: String(id), score: scores[Math.floor(id / 20)], country: 'EE',
    answers: { example: (id % 9 === 0 ? 'other' : id % 3 ? 'a' : 'b') as 'a' | 'b' | 'other' },
  }));
  for (const [layout, height] of [
    [arcLayout(dots), viewBox.height], [answerLayout(dots, 'example', 'a'), resultHeight],
  ] as const) {
    assert.equal(layout.dots.length, 200);
    for (const [i, point] of layout.dots.entries()) {
      assert.ok(point.x >= point.r && point.x <= 400 - point.r);
      assert.ok(point.y >= point.r && point.y <= height - point.r);
      for (const previous of layout.dots.slice(0, i)) {
        assert.ok(Math.hypot(point.x - previous.x, point.y - previous.y) >= point.r + previous.r - 0.001);
      }
    }
  }
});

test('density adapts when a configured sample concentrates on one score and answer', () => {
  const dots = Array.from({ length: 1600 }, (_, id) => ({
    id: String(id), score: 3 as const, country: 'EE', answers: { example: 'other' as const },
  }));
  assert.equal(arcLayout(dots).dots.length, 1600);
  assert.equal(answerLayout(dots, 'example', 'a').counts.other, 1600);
});
