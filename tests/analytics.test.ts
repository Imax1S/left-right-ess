import assert from 'node:assert/strict';
import test from 'node:test';
import { createFunnelTracker, funnelPayload } from '../src/story/analytics.ts';

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
