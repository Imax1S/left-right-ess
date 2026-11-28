import assert from 'node:assert/strict';
import test from 'node:test';
import { createFunnelTracker, createVisitTracker, funnelPayload } from '../src/story/analytics.ts';

import type { UmamiTracker } from '../src/story/analytics.ts';

const metadata = { website: 'example-id', hostname: 'leftright.center', screen: '390x844', language: 'en', referrer: '' };
const nextTurn = () => new Promise(resolve => setImmediate(resolve));

test('the funnel records each milestone once per page, including after Back', () => {
  const events: string[] = [];
  const trackProgress = createFunnelTracker(event => events.push(event));

  trackProgress('scale', -1);
  trackProgress('among', -1);
  trackProgress('question', 0);
  trackProgress('result', 0);
  trackProgress('question', 0);
  trackProgress('question', 1);
  trackProgress('missing-prompt', -1);
  trackProgress('engagement', -1);
  trackProgress('missing-prompt', -1);
  trackProgress('conclusion', 6);
  trackProgress('result', 6);
  trackProgress('conclusion', 6);

  assert.deepEqual(events, ['story_started', 'act_two_reached', 'finale_seen']);
});

test('analytics sends only site metadata and the milestone name', () => {
  const incoming = {
    website: 'example-id',
    hostname: 'leftright.center',
    screen: '390x844',
    language: 'en',
    url: 'https://leftright.center/?score=7#/answer=a',
    referrer: 'https://example.com/private?value=abc#details',
    title: 'Personalised result',
    data: { score: 7, answers: ['a'] },
    id: 'visitor-id',
  };
  assert.deepEqual(funnelPayload(incoming, 'act_two_reached'), {
    website: 'example-id',
    hostname: 'leftright.center',
    screen: '390x844',
    language: 'en',
    url: '/',
    referrer: 'https://example.com',
    title: 'Left. Right.',
    name: 'act_two_reached',
  });
  assert.equal('name' in funnelPayload(incoming), false);
  assert.equal(funnelPayload({ ...incoming, referrer: '/about' }).referrer, '');
});

test('analytics starts on consent and sends only milestones reached while active', async () => {
  const sent: Array<string | undefined> = [];
  let loads = 0;
  const visit = createVisitTracker(async () => {
    loads++;
    return { track: async build => { sent.push(build(metadata).name); } };
  });

  visit.progress('question', 0);
  await nextTurn();
  assert.equal(loads, 0);
  assert.deepEqual(sent, []);

  visit.allow();
  visit.allow();
  visit.progress('missing-prompt', -1);
  await nextTurn();
  assert.equal(loads, 1);
  assert.deepEqual(sent, [undefined, 'act_two_reached']);

  visit.stop();
  visit.progress('conclusion', 6);
  await nextTurn();
  assert.deepEqual(sent, [undefined, 'act_two_reached']);
});

test('withdrawal cancels queued requests even if a visitor consents again before Umami loads', async () => {
  const sent: Array<string | undefined> = [];
  let resolve!: (value: UmamiTracker) => void;
  const ready = new Promise<UmamiTracker>(done => { resolve = done; });
  const visit = createVisitTracker(() => ready);

  visit.allow();
  visit.progress('question', 0);
  await nextTurn();
  visit.stop();
  visit.allow();
  visit.progress('missing-prompt', -1);
  resolve({ track: async build => { sent.push(build(metadata).name); } });
  await nextTurn();

  assert.deepEqual(sent, [undefined, 'act_two_reached']);
});
