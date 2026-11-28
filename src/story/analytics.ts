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

export type UmamiTracker = {
  track: (payload: (metadata: VisitMetadata) => ReturnType<typeof funnelPayload>) => Promise<unknown>;
};

export function createVisitTracker(load: () => Promise<UmamiTracker | undefined>) {
  let active: { queue: Promise<void>; progress: ReturnType<typeof createFunnelTracker> } | undefined;
  let tracker: Promise<UmamiTracker | undefined> | undefined;

  function send(event?: Milestone) {
    const consent = active;
    if (!consent) return;
    consent.queue = consent.queue.then(async () => {
      if (active !== consent) return;
      const umami = await (tracker ??= load());
      if (active === consent) await umami?.track(metadata => funnelPayload(metadata, event));
    }).catch(() => {
      // Analytics is optional and should never interrupt the story.
    });
  }

  return {
    allow() {
      if (active) return;
      active = { queue: Promise.resolve(), progress: createFunnelTracker(send) };
      send();
    },
    stop() {
      active = undefined;
    },
    progress(step: Session['step'], index: number) {
      active?.progress(step, index);
    },
  };
}

const hostname = 'leftright.center';

function umamiWebsiteId() {
  const websiteId: string | undefined = import.meta.env.VITE_UMAMI_WEBSITE_ID;
  if (location.hostname === hostname && import.meta.env.VITE_PRIVACY_CONTACT_EMAIL && websiteId &&
      /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(websiteId)) return websiteId;
}

export function analyticsChoiceAvailable() {
  return import.meta.env.DEV || Boolean(umamiWebsiteId());
}

function loadUmamiTracker() {
  const websiteId = umamiWebsiteId();
  if (!websiteId) return Promise.resolve(undefined);

  return new Promise<UmamiTracker | undefined>(resolve => {
    const script = document.createElement('script');
    script.src = 'https://cloud.umami.is/script.js';
    script.referrerPolicy = 'no-referrer';
    script.dataset.websiteId = websiteId;
    script.dataset.domains = hostname;
    script.dataset.autoTrack = 'false';
    script.onload = () => resolve((window as Window & { umami?: UmamiTracker }).umami);
    script.onerror = () => resolve(undefined);
    document.head.append(script);
  });
}

export const storyAnalytics = createVisitTracker(loadUmamiTracker);
