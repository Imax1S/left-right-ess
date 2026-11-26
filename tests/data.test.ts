import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareStory } from '../src/domain/prepareStory.ts';
import { ess11Source } from '../src/ess/source.ts';
import config from '../story.config.ts';

test('includes the centre and neutral responses in the weighted comparison', async () => {
  const source = await ess11Source();
  const data = await prepareStory(source, {
    questions: ['inequality'], countries: source.countryCodes, dotCount: 100,
  });
  assert.equal(data.source.records, 50116);
  assert.equal(data.eligibleCount, 32973);
  assert.ok(data.dots.some(dot => dot.score === 5));
  assert.equal(data.dots.length, 100);
  assert.equal(new Set(data.dots.map(dot => dot.id)).size, 100);
  assert.deepEqual([...new Set(data.dots.map(dot => dot.country))].sort(), [...source.countryCodes].sort());
  assert.ok(data.dots.filter(dot => dot.country === 'DE').length > data.dots.filter(dot => dot.country === 'EE').length);
  const question = data.questions[0];
  assert.equal(question.options.neutral, 'Neither agree nor disagree');
  for (const [group, agree, neutral] of [
    ['left', '79.1', '13.6'], ['centre', '71.0', '17.0'], ['right', '61.9', '20.3'],
  ] as const) {
    const { a, b, neutral: middle } = question.stats[group];
    assert.equal(a.percent?.toFixed(1), agree);
    assert.equal(middle.percent?.toFixed(1), neutral);
    assert.equal(a.count + b.count + middle.count, a.total);
    assert.ok(Math.abs((a.percent ?? 0) + (b.percent ?? 0) + (middle.percent ?? 0) - 100) < 1e-9);
  }
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

test('the second act keeps unplaced people out of the arc and uses complete directional answers for the grid', async () => {
  const data = await prepareStory(await ess11Source(), config);
  const engagement = data.disillusioned;
  const quadrant = data.quadrant;
  assert.ok(engagement && quadrant);
  assert.equal(engagement.eligibleTotalCount, data.eligibleCount + engagement.unplacedCount);
  assert.equal(engagement.unplacedSharePercent.toFixed(1), '11.9');
  assert.equal(engagement.groups.unplaced.votedPercent?.toFixed(1), '52.8');
  assert.equal(engagement.groups.unplaced.lowTrustPercent?.toFixed(1), '59.8');
  assert.equal(engagement.groups.unplaced.understandingPercent?.toFixed(1), '84.5');
  assert.equal(engagement.groups.left.understandingPercent?.toFixed(1), '91.1');
  assert.ok(engagement.groups.unplaced.noSayPercent! > engagement.groups.centre.noSayPercent!);
  assert.ok(engagement.groups.centre.votedPercent! < engagement.groups.right.votedPercent!);
  const rights = Object.values(quadrant.byGroup.right);
  assert.ok(rights.every(value => value !== null && value > 10));
  assert.ok(Math.abs(rights.reduce<number>((sum, value) => sum + (value ?? 0), 0) - 100) < 1e-9);
  assert.equal(data.dots.length, 100);
});
