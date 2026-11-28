import type { Session } from './session.ts';

type Milestone = 'story_started' | 'act_two_reached' | 'finale_seen';

export function createFunnelTracker(track: (event: Milestone) => void) {
  const seen = new Set<Milestone>();
  return (step: Session['step'], index: number) => {
    const event = step === 'question' && index === 0 ? 'story_started'
      : step === 'missing-prompt' ? 'act_two_reached'
      : step === 'conclusion' ? 'finale_seen' : undefined;

    if (event && !seen.has(event)) {
      seen.add(event);
      track(event);
    }
  };
}

type VisitMetadata = {
  website: string;
  hostname: string;
  screen: string;
  language: string;
  referrer: string;
};

function referrerOrigin(referrer: string) {
  try {
    const url = new URL(referrer);
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.origin;
  } catch {
    // Direct visits and internal navigation may have no absolute referrer.
  }
  return '';
}

export function funnelPayload(metadata: VisitMetadata, event?: Milestone) {
  const { website, hostname, screen, language, referrer } = metadata;
  return {
    website, hostname, screen, language,
    url: '/',
    title: 'Left. Right.',
    referrer: referrerOrigin(referrer),
    ...(event ? { name: event } : {}),
  };
}

type Umami = {
  track: (payload: (metadata: VisitMetadata) => ReturnType<typeof funnelPayload>) => Promise<unknown>;
};

const hostname = 'leftright.center';
let queue: Promise<Umami | undefined> | undefined;

function send(event?: Milestone) {
  queue = queue?.then(async tracker => {
    try {
      await tracker?.track(metadata => funnelPayload(metadata, event));
    } catch {
      // Analytics is optional and should never interrupt the story.
    }
    return tracker;
  });
}

export function startAnalytics(websiteId: string | undefined) {
  if (queue || location.hostname !== hostname || !websiteId ||
      !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(websiteId)) return;

  queue = new Promise(resolve => {
    const script = document.createElement('script');
    script.src = 'https://cloud.umami.is/script.js';
    script.referrerPolicy = 'no-referrer';
    script.dataset.websiteId = websiteId;
    script.dataset.domains = hostname;
    script.dataset.autoTrack = 'false';
    script.onload = () => resolve((window as Window & { umami?: Umami }).umami);
    script.onerror = () => resolve(undefined);
    document.head.append(script);
  });
  send();
}

export const trackStoryProgress = createFunnelTracker(send);
