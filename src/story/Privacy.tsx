import { useId, useRef, useState } from 'react';
import { Arrow } from './controls.tsx';
import type { AnalyticsChoice } from './analyticsConsent.ts';
import { Wordmark } from './Story.tsx';
import './privacy.css';

type Preferences = {
  choice: AnalyticsChoice | null;
  onChoice: (choice: AnalyticsChoice) => void;
};

function ChoiceButtons({ choice, onChoice }: Preferences) {
  return <div className="analytics-choice-buttons">
    <button type="button" aria-pressed={choice === null ? undefined : choice === 'allow'}
      onClick={() => onChoice('allow')}>Allow analytics</button>
    <button type="button" aria-pressed={choice === null ? undefined : choice === 'deny'}
      onClick={() => onChoice('deny')}>Decline analytics</button>
  </div>;
}

export function ConsentPrompt({ onChoice }: Pick<Preferences, 'onChoice'>) {
  const heading = useId();
  return <aside className="analytics-prompt" aria-labelledby={heading}>
    <div>
      <h2 id={heading}>Optional analytics</h2>
      <p>Umami helps us see how far readers get. Your answers stay in your browser. <a href="#/privacy">Privacy details</a></p>
    </div>
    <ChoiceButtons choice={null} onChoice={onChoice} />
  </aside>;
}

export function PrivacyLinks({ choice, onChoice }: Preferences) {
  const link = useRef<HTMLAnchorElement>(null);
  const [announcement, setAnnouncement] = useState('');
  return <>
    <a href="#/privacy" ref={link}>Privacy</a>
    {choice === 'allow' && <button type="button" className="privacy-footer-button" onClick={() => {
      onChoice('deny');
      setAnnouncement('Analytics is off.');
      link.current?.focus();
    }}>Turn off analytics</button>}
    <span className="privacy-announcement" role="status">{announcement}</span>
  </>;
}

export function Privacy({ choice, onChoice, available }: Preferences & { available: boolean }) {
  const email: string | undefined = import.meta.env.VITE_PRIVACY_CONTACT_EMAIL;

  return <main className="story-page privacy-page">
    <header className="story-header">
      <Wordmark />
      <a href="#" className="back-button"><Arrow back /> Back to the story</a>
    </header>
    <h1 id="privacy-heading" tabIndex={-1} className="story-heading">Privacy</h1>
    <p>Max Ionko runs Left. Right. and is responsible for its analytics. Your survey answers and position on the political scale stay in your browser. If you share your result, you choose where to send the image.</p>

    <section className="privacy-section" aria-labelledby="analytics-heading">
      <h2 id="analytics-heading">Optional analytics</h2>
      <p>With your consent, Umami Cloud records a page visit and three milestones: starting the survey, reaching the second part and seeing the final screen. We use those counts to see where readers leave the story.</p>
      <p>Umami receives the referring site’s domain, browser language and screen size. It processes your IP address and browser information to group events into sessions and estimate location. Its standard analytics records omit the IP address, but technical logs may include it. <a href="https://docs.umami.is/docs/metric-definitions">Umami’s data collection</a></p>
      <p>Umami stores analytics in the EU for six months. Technical services, including security and support, may process data elsewhere. Umami’s data processing agreement includes safeguards for international transfers. <a href="https://umami.is/dpa">Umami’s data processing agreement</a></p>
    </section>

    <section className="privacy-section" aria-labelledby="preferences-heading">
      <h2 id="preferences-heading">Your analytics choice</h2>
      {available ? <>
        <p>We save your choice in this browser so it applies on your next visit. You can change it here or turn analytics off in the story footer. Turning it off stops future collection.</p>
        <div className="privacy-preferences">
          <p role="status">{choice === 'allow' ? 'Analytics is on.' : 'Analytics is off.'}</p>
          <ChoiceButtons choice={choice} onChoice={onChoice} />
        </div>
      </> : <p>Analytics is currently off.</p>}
    </section>

    <section className="privacy-section" aria-labelledby="hosting-heading">
      <h2 id="hosting-heading">Hosting</h2>
      <p>GitHub Pages hosts this site and logs visitor IP addresses for security. <a href="https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#data-collection">GitHub Pages data collection</a></p>
    </section>

    <section className="privacy-section" aria-labelledby="rights-heading">
      <h2 id="rights-heading">Your data rights</h2>
      <p>Depending on your circumstances, you can request access, correction, deletion, restriction or a copy of your personal data, or object to its processing. You can also lodge a complaint with your local data protection authority.</p>
      {email && <p>For privacy questions or data requests, email <a href={`mailto:${email}`}>{email}</a>.</p>}
    </section>
  </main>;
}
