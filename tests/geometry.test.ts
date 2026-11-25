import assert from 'node:assert/strict';
import test from 'node:test';
import { arcLayout, answerLayout, readerOnArc, scoreFromArcPoint, unplacedMarker, viewBox } from '../src/visualization/geometry.ts';
import { scores } from '../src/domain/model.ts';

test('arc and all answer bands keep people in bounds without overlap', () => {
  const dots = Array.from({ length: 200 }, (_, id) => ({
    id: String(id), score: scores[Math.floor(id / 20)], country: 'EE',
    answers: { example: (id % 9 === 0 ? 'other' : id % 3 ? 'a' : 'b') as 'a' | 'b' | 'other' },
  }));
  const binaryCount = dots.filter(dot => dot.answers.example !== 'other').length;
  for (const [layout, count] of [
    [arcLayout(dots), 200], [answerLayout(dots, 'example', 'a', 3), binaryCount],
  ] as const) {
    assert.equal(layout.dots.length, count);
    for (const [i, point] of layout.dots.entries()) {
      assert.ok(point.x >= point.r && point.x <= 400 - point.r);
      assert.ok(point.y >= point.r && point.y <= viewBox.height - point.r);
      for (const previous of layout.dots.slice(0, i)) {
        assert.ok(Math.hypot(point.x - previous.x, point.y - previous.y) >= point.r + previous.r - 0.001);
      }
    }
  }
});

test('density adapts when a configured sample concentrates on one score and answer', () => {
  const dots = Array.from({ length: 1600 }, (_, id) => ({
    id: String(id), score: 3 as const, country: 'EE', answers: { example: 'a' as const },
  }));
  assert.equal(arcLayout(dots).dots.length, 1600);
  assert.equal(answerLayout(dots, 'example', 'a', 3).counts.a, 1600);
});

test('dragging around the arc resolves every scale mark and skips the centre', () => {
  for (const score of scores) {
    assert.equal(scoreFromArcPoint(readerOnArc(score).marker), score);
  }
  assert.equal(scoreFromArcPoint({ x: 200, y: 190 }), null);
  assert.equal(scoreFromArcPoint({ x: 200, y: 10 }), 6);
  assert.equal(scoreFromArcPoint(unplacedMarker, true), null);
  assert.equal(scoreFromArcPoint(readerOnArc(8).marker, true), 8);
});

test('answer groups share the arc footprint and keep the reader marker clear', () => {
  const dots = Array.from({ length: 100 }, (_, id) => ({
    id: String(id), score: 3 as const, country: 'EE',
    answers: { example: (id % 8 === 0 ? 'other' : id % 3 ? 'a' : 'b') as 'a' | 'b' | 'other' },
  }));
  const layout = answerLayout(dots, 'example', 'b', 8);
  for (const point of layout.dots) {
    const zone = point.person.answers.example;
    if (zone === 'a') assert.ok(point.x < 200);
    if (zone === 'b') assert.ok(point.x > 200);
    assert.ok(point.y + point.r <= 190);
    assert.ok(Math.hypot(point.x - layout.marker.x, point.y - layout.marker.y) >= point.r + 17);
  }
});

test('puts the selected answer on the side of the reader’s destination', () => {
  const dots = [
    { id: '1', score: 2 as const, country: 'EE', answers: { q: 'a' as const } },
    { id: '2', score: 8 as const, country: 'EE', answers: { q: 'b' as const } },
  ];
  const layout = answerLayout(dots, 'q', 'a', 8);
  assert.equal(layout.sides.a, 'right');
  assert.ok(layout.dots.find(dot => dot.person.id === '1')!.x > 200);
  assert.ok(layout.dots.find(dot => dot.person.id === '2')!.x < 200);
  assert.deepEqual(layout.marker, readerOnArc(8).marker);
});

test('reserves room for the reader in the selected score band', () => {
  const dots = Array.from({ length: 44 }, (_, id) => ({
    id: String(id), score: id < 40 ? 8 as const : 0 as const, country: 'EE', answers: {},
  }));
  const { marker } = readerOnArc(8);
  const initial = arcLayout(dots);
  const placed = arcLayout(dots, 8);
  assert.equal(placed.dots.length, dots.length);
  for (const dot of placed.dots) {
    assert.ok(Math.hypot(dot.x - marker.x, dot.y - marker.y) >= dot.r + 18);
  }
  assert.deepEqual(placed.dots.filter(dot => dot.person.score === 0), initial.dots.filter(dot => dot.person.score === 0));
});

test('leaves out respondents on the question where they answered outside the two choices', () => {
  const dots = [
    { id: '1', score: 2 as const, country: 'EE', answers: { first: 'other' as const, second: 'a' as const } },
    { id: '2', score: 8 as const, country: 'EE', answers: { first: 'b' as const, second: 'other' as const } },
  ];
  assert.deepEqual(answerLayout(dots, 'first', 'a', 2).dots.map(dot => dot.person.id), ['2']);
  assert.deepEqual(answerLayout(dots, 'second', 'a', 2).dots.map(dot => dot.person.id), ['1']);
});
