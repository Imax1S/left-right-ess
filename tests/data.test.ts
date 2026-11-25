import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareStory } from '../src/domain/prepareStory.ts';
import { ess11Source } from '../src/ess/source.ts';

test('uses the weighted two-answer denominator on each side', async () => {
  const source = await ess11Source();
  const data = await prepareStory(source, {
    questions: ['inequality'], countries: source.countryCodes, dotCount: 100,
  });
  assert.equal(data.source.records, 50116);
  assert.equal(data.eligibleCount, 22123);
  assert.equal(data.dots.length, 100);
  assert.equal(new Set(data.dots.map(dot => dot.id)).size, 100);
  assert.deepEqual([...new Set(data.dots.map(dot => dot.country))].sort(), [...source.countryCodes].sort());
  assert.ok(data.dots.filter(dot => dot.country === 'DE').length > data.dots.filter(dot => dot.country === 'EE').length);
  const { left, right } = data.questions[0].stats;
  assert.equal(left.a.percent?.toFixed(1), '91.6');
  assert.equal(left.a.total, 9132);
  assert.equal(right.a.percent?.toFixed(1), '77.7');
  assert.equal(right.a.total, 9361);
  assert.equal(left.a.count + left.b.count, left.a.total);
  assert.equal(right.a.count + right.b.count, right.a.total);
  assert.ok(Math.abs((left.a.percent ?? 0) + (left.b.percent ?? 0) - 100) < 1e-9);
  assert.ok(Math.abs((right.a.percent ?? 0) + (right.b.percent ?? 0) - 100) < 1e-9);
  assert.deepEqual(Object.keys(left).sort(), ['a', 'b']);
  assert.equal(data.countries.find(country => country.code === 'EE')?.name, 'Estonia');
});

test('preserves configured question order, country scope and requested dot count', async () => {
  const source = await ess11Source();
  const data = await prepareStory(source, {
    questions: ['freedom', 'inequality'], countries: ['EE', 'FI'], dotCount: 17,
  });
  assert.deepEqual(data.questions.map(question => question.id), ['freedom', 'inequality']);
  assert.deepEqual(data.countries.map(country => country.code), ['EE', 'FI']);
  assert.equal(data.dots.length, 17);
  assert.ok(data.dots.every(dot => dot.country === 'EE' || dot.country === 'FI'));
  assert.equal(JSON.stringify(data), JSON.stringify(await prepareStory(source, {
    questions: ['freedom', 'inequality'], countries: ['EE', 'FI'], dotCount: 17,
  })));
});

test('rejects unknown countries and questions during generation', async () => {
  const source = await ess11Source();
  await assert.rejects(prepareStory(source, {
    questions: ['inequality'], countries: ['US'], dotCount: 10,
  }), /Unknown country/);
  await assert.rejects(prepareStory(source, {
    questions: ['unavailable'], countries: ['EE'], dotCount: 10,
  }), /Unknown question/);
});

test('rejects a dot count too small to show every configured country', async () => {
  const source = await ess11Source();
  await assert.rejects(prepareStory(source, {
    questions: ['inequality'], countries: ['EE', 'FI'], dotCount: 1,
  }), /dotCount must be at least 2/);
});
