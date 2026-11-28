import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { StoryData } from './domain/model.ts';
import { Methodology } from './story/Methodology.tsx';
import { Story, Wordmark } from './story/Story.tsx';
import './style.css';

function App({ data }: { data: StoryData }) {
  const [showMethod, setShowMethod] = useState(location.hash === '#/about');
  useEffect(() => {
    function navigate() {
      setShowMethod(location.hash === '#/about');
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, []);
  useEffect(() => {
    if (showMethod) document.getElementById('method-heading')?.focus();
  }, [showMethod]);

  return <>
    <Story data={data} showMethod={showMethod} />
    {showMethod && <Methodology data={data} />}
  </>;
}

const root = createRoot(document.getElementById('root')!);
root.render(<main className="status"><Wordmark /><p role="status">Loading the survey…</p></main>);
try {
  const response = await fetch(new URL('./story.json?v=9', document.baseURI));
  if (!response.ok) throw new Error(`Survey data returned ${response.status}`);
  const data: StoryData = await response.json();
  root.render(<StrictMode><App data={data} /></StrictMode>);
} catch (error) {
  console.error(error);
  root.render(<main className="status"><Wordmark /><h1>Couldn’t load the survey</h1>
    <button className="continue" onClick={() => location.reload()}>Try again</button></main>);
}
