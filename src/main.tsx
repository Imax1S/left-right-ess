import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { StoryData } from './domain/model.ts';
import { analyticsChoiceAvailable, storyAnalytics } from './story/analytics.ts';
import { analyticsChoiceKey, readAnalyticsChoice, rememberAnalyticsChoice } from './story/analyticsConsent.ts';
import type { AnalyticsChoice } from './story/analyticsConsent.ts';
import { Methodology } from './story/Methodology.tsx';
import { ConsentPrompt, Privacy, PrivacyLinks } from './story/Privacy.tsx';
import { Story, Wordmark } from './story/Story.tsx';
import './style.css';

function currentPage() {
  if (location.hash === '#/privacy') return 'privacy';
  if (location.hash === '#/about') return 'method';
  return 'story';
}

const showAnalyticsChoice = analyticsChoiceAvailable();

function applyAnalyticsChoice(choice: AnalyticsChoice | null) {
  if (showAnalyticsChoice && choice === 'allow') storyAnalytics.allow();
  else storyAnalytics.stop();
}

function App({ data }: { data: StoryData | null | undefined }) {
  const [page, setPage] = useState(currentPage);
  const [choice, setChoice] = useState(readAnalyticsChoice);

  useEffect(() => {
    function navigate() {
      setPage(currentPage());
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    function synchronizeChoice(event: StorageEvent) {
      if (event.key !== null && event.key !== analyticsChoiceKey) return;
      const storedChoice = readAnalyticsChoice();
      applyAnalyticsChoice(storedChoice);
      setChoice(storedChoice);
    }
    window.addEventListener('hashchange', navigate);
    window.addEventListener('storage', synchronizeChoice);
    return () => {
      window.removeEventListener('hashchange', navigate);
      window.removeEventListener('storage', synchronizeChoice);
    };
  }, []);
  const pageHeading = page === 'privacy' ? 'privacy-heading'
    : page === 'method' && data ? 'method-heading' : null;
  useEffect(() => {
    if (pageHeading) document.getElementById(pageHeading)?.focus();
  }, [pageHeading]);

  function chooseAnalytics(next: AnalyticsChoice) {
    applyAnalyticsChoice(next);
    rememberAnalyticsChoice(next);
    setChoice(next);
  }

  const privacyLinks = <PrivacyLinks choice={showAnalyticsChoice ? choice : null} onChoice={chooseAnalytics} />;

  return <>
    {page === 'story' && showAnalyticsChoice && choice === null && data && <ConsentPrompt onChoice={next => {
      chooseAnalytics(next);
      document.getElementById('story-heading')?.focus({ preventScroll: true });
    }} />}
    {data && <Story data={data} hidden={page !== 'story'} privacyLinks={privacyLinks} />}
    {page === 'method' && data && <Methodology data={data} privacyLinks={privacyLinks} />}
    {page === 'privacy' && <Privacy choice={choice} onChoice={chooseAnalytics} available={showAnalyticsChoice} />}
    {page !== 'privacy' && !data && <main className="status">
      <Wordmark />
      {data === undefined ? <p role="status">Loading the survey…</p> : <>
        <h1>Couldn’t load the survey</h1>
        <button className="continue" onClick={() => location.reload()}>Try again</button>
      </>}
      <footer className="story-footer">{privacyLinks}</footer>
    </main>}
  </>;
}

applyAnalyticsChoice(readAnalyticsChoice());

const root = createRoot(document.getElementById('root')!);
function render(data: StoryData | null | undefined) {
  root.render(<StrictMode><App data={data} /></StrictMode>);
}
render(undefined);
try {
  const response = await fetch(new URL('./story.json?v=10', document.baseURI));
  if (!response.ok) throw new Error(`Survey data returned ${response.status}`);
  const data: StoryData = await response.json();
  render(data);
} catch (error) {
  console.error(error);
  render(null);
}
