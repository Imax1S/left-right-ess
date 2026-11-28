import assert from 'node:assert/strict';
import test from 'node:test';
import { arcBand, arcLayout, answerLayout, circleLayout, closingBand, offArcLayout, readerOnArc, scoreFromArcPoint, unplacedMarker, viewBox } from '../src/visualization/geometry.ts';
import { scores } from '../src/domain/model.ts';

function question(id: string, neutral?: string) {
  return { id, options: { a: 'Agree', neutral, b: 'Disagree' } };
}

test('the closing circle retains every original dot and leaves space for the reader', () => {
  const dots = Array.from({ length: 100 }, (_, id) => ({
    id: String(id), score: scores[id % scores.length], country: 'EE', answers: {},
  }));
  const offArc = Array.from({ length: 14 }, (_, index) => 'off-arc-' + index);
  const circle = circleLayout(dots, offArc);
  assert.equal(circle.dots.size, dots.length + offArc.length);
  const occupied = new Set<string>();
  for (const id of [...dots.map(dot => dot.id), ...offArc]) {
    const { x, y, r } = circle.dots.get(id)!;
    occupied.add(x + ':' + y);
    assert.ok(x >= r && x <= viewBox.width - r && y >= r && y <= viewBox.height - r);
    assert.ok(Math.hypot(x - circle.marker.x, y - circle.marker.y) >= r + 20);
  }
  assert.equal(occupied.size, dots.length + offArc.length);
});

test('the symbolic off-arc dots fit in one centered group inside the hollow', () => {
  const together = offArcLayout(14);
  assert.equal(together.length, 14);
  const meanX = together.reduce((sum, dot) => sum + dot.x, 0) / together.length;
  assert.ok(Math.abs(meanX - 200) < 1e-6);
  for (const group of [together, offArcLayout(100)]) {
    for (const [index, dot] of group.entries()) {
      assert.ok(Math.hypot(dot.x - 200, dot.y - 190) + dot.r < 73);
      for (const previous of group.slice(0, index)) {
        assert.ok(Math.hypot(dot.x - previous.x, dot.y - previous.y) >= dot.r + previous.r);
      }
    }
  }
});

test('the ends of the arc sweep downward until they meet inside the chart', () => {
  function ends(progress: number) {
    const numbers = (side: 'left' | 'right') => closingBand(side, progress)
      .match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)!.map(Number);
    return [numbers('left').slice(0, 2), numbers('right').slice(7, 9)];
  }

  assert.deepEqual(ends(0).map(point => point.map(Math.round)), [[12, 190], [388, 190]]);
  assert.ok(ends(0.5).every(([, y]) => y > 190 && y < viewBox.height));
  assert.deepEqual(ends(1).map(point => point.map(Math.round)), [[200, 256], [200, 256]]);
});

test('arc and all answer bands keep people in bounds without overlap', () => {
  const dots = Array.from({ length: 200 }, (_, id) => ({
    id: String(id), score: scores[id % scores.length], country: 'EE',
    answers: { example: (id % 9 === 0 ? 'other' : id % 3 ? 'a' : 'b') as 'a' | 'b' | 'other' },
  }));
  const binaryCount = dots.filter(dot => dot.answers.example !== 'other').length;
  for (const [layout, count] of [
    [arcLayout(dots), 200], [answerLayout(dots, question('example'), 'a', 3), binaryCount],
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
  assert.equal(answerLayout(dots, question('example'), 'a', 3).bands[0].count, 1600);
});

test('dragging around the arc resolves every scale mark including the centre', () => {
  for (const score of scores) {
    assert.equal(scoreFromArcPoint(readerOnArc(score).marker), score);
  }
  assert.equal(scoreFromArcPoint({ x: 200, y: 190 }), null);
  assert.equal(scoreFromArcPoint({ x: 200, y: 10 }), 5);
  assert.equal(scoreFromArcPoint(unplacedMarker, true), null);
  assert.equal(scoreFromArcPoint(readerOnArc(8).marker, true), 8);
});

test('answer groups share the arc footprint and keep the reader marker clear', () => {
  const dots = Array.from({ length: 100 }, (_, id) => ({
    id: String(id), score: 3 as const, country: 'EE',
    answers: { example: (id % 8 === 0 ? 'other' : id % 3 ? 'a' : 'b') as 'a' | 'b' | 'other' },
  }));
  const layout = answerLayout(dots, question('example'), 'b', 8);
  for (const point of layout.dots) {
    const zone = point.person.answers.example;
    if (zone === 'a') assert.ok(point.x < 200);
    if (zone === 'b') assert.ok(point.x > 200);
    assert.ok(point.y + point.r <= 190);
    assert.ok(Math.hypot(point.x - layout.marker.x, point.y - layout.marker.y) >= point.r + 17);
  }
});

test('keeps the outer answer order for either choice and reader destination', () => {
  const dots = [
    { id: '1', score: 2 as const, country: 'EE', answers: { q: 'a' as const } },
    { id: '2', score: 8 as const, country: 'EE', answers: { q: 'b' as const } },
  ];
  for (const choice of ['a', 'b'] as const) {
    for (const score of [2, 5, 8] as const) {
      const layout = answerLayout(dots, question('q'), choice, score);
      assert.deepEqual(layout.bands.map(band => band.option), ['a', 'b']);
      assert.deepEqual(layout.bands.map(band => band.path), [arcBand(0, Math.PI / 2), arcBand(Math.PI / 2, Math.PI)]);
      assert.ok(layout.dots.find(dot => dot.person.id === '1')!.x < 200);
      assert.ok(layout.dots.find(dot => dot.person.id === '2')!.x > 200);
      assert.equal(layout.marker.x < 200, choice === 'a');
    }
  }
});

test('shows Yes on the left and No on the right for voting', () => {
  for (const [choice, score] of [['a', 8], ['b', 2]] as const) {
    const result = answerLayout([], question('vote'), choice, score);
    assert.deepEqual(result.bands.map(band => band.option), ['a', 'b']);
    assert.equal(result.marker.x < 200, choice === 'a');
  }
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

test('places a lone respondent clear of the marker at every mark', () => {
  for (const score of scores) {
    const respondent = { id: '1', country: 'EE', score, answers: {} };
    const { dots } = arcLayout([respondent], score);
    assert.equal(dots.length, 1);
    assert.equal(dots[0].person, respondent);
    const { marker } = readerOnArc(score);
    assert.ok(Math.hypot(dots[0].x - marker.x, dots[0].y - marker.y) >= dots[0].r + 21);
    assert.equal(scoreFromArcPoint(dots[0], true), score);
  }
});

test('leaves out respondents on the question where they answered outside the two choices', () => {
  const dots = [
    { id: '1', score: 2 as const, country: 'EE', answers: { first: 'other' as const, second: 'a' as const } },
    { id: '2', score: 8 as const, country: 'EE', answers: { first: 'b' as const, second: 'other' as const } },
  ];
  assert.deepEqual(answerLayout(dots, question('first'), 'a', 2).dots.map(dot => dot.person.id), ['2']);
  assert.deepEqual(answerLayout(dots, question('second'), 'a', 2).dots.map(dot => dot.person.id), ['1']);
});

test('keeps the arc connected around neutral respondents in its hollow', () => {
  const dots = (['a', 'b', 'neutral', 'missing', 'other'] as const).map(option => ({
    id: option, country: 'EE', score: 5 as const, answers: { q: option },
  }));
  const layout = answerLayout(dots, question('q', 'Neither'), 'neutral', 5);
  assert.deepEqual(layout.bands.map(band => [band.option, band.count]), [['a', 1], ['neutral', 1], ['b', 1]]);
  assert.equal(layout.bands[0].path, arcBand(0, Math.PI / 2));
  assert.equal(layout.bands[2].path, arcBand(Math.PI / 2, Math.PI));
  assert.match(layout.bands[1].path, /^M 127 190 A 73 73 .* 273 190 Z$/);
  assert.deepEqual(layout.dots.map(dot => dot.person.id).sort(), ['a', 'b', 'neutral']);
  const middle = layout.dots.find(dot => dot.person.id === 'neutral')!;
  assert.ok(Math.hypot(middle.x - 200, middle.y - 190) + middle.r < 73);
  assert.ok(Math.hypot(layout.marker.x - 200, layout.marker.y - 190) + 17 < 73);
  assert.ok(Math.hypot(middle.x - layout.marker.x, middle.y - layout.marker.y) >= middle.r + 17);
  assert.equal(layout.missing, 1);
  assert.equal(layout.other, 1);
});
