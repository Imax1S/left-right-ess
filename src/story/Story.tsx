import { useEffect, useMemo, useReducer, useRef } from 'react';
import type { ReactNode } from 'react';
import { sideOf } from '../domain/model.ts';
import type { Score, StoryData } from '../domain/model.ts';
import { ArcChart } from '../visualization/ArcChart.tsx';
import { Arrow, CountryControls, QuestionControls, ResultControls, ScaleControls, integer, placement } from './controls.tsx';
import { createSessionReducer, initialSession } from './session.ts';

export function Wordmark() {
  return <span className="wordmark"><b>Left.</b> <b>Right.</b></span>;
}

function Fact({ value, caption }: { value: ReactNode; caption: string }) {
  return <div className="fact"><strong>{value}</strong><span>{caption}</span></div>;
}

export function Story({ data, showMethod }: { data: StoryData; showMethod: boolean }) {
  const reduce = useMemo(() => createSessionReducer(
    data.questions.map(question => question.id), data.countries.map(country => country.code),
  ), [data]);
  const [state, dispatch] = useReducer(reduce, initialSession);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusOnChange = useRef(false);
  const { step, score } = state;
  const country = state.step === 'among' ? state.country : null;
  const index = 'index' in state ? state.index : -1;
  const question = index >= 0 ? data.questions[index] : null;
  const result = state.step === 'result' && question ? { question, choice: state.option } : null;
  const shown = data.dots.filter(dot => dot.score === score).length;
  const countryCount = country ? data.dots.filter(dot => dot.country === country).length : 0;

  useEffect(() => {
    if (showMethod || !focusOnChange.current) return;
    headingRef.current?.focus({ preventScroll: true });
    if (step !== 'result') window.scrollTo({ top: 0, behavior: 'instant' });
  }, [step, index, showMethod]);

  function navigate(action: Parameters<typeof dispatch>[0]) {
    focusOnChange.current = true;
    dispatch(action);
  }

  function place(value: Score) {
    dispatch({ type: 'place', score: value });
  }

  let heading: ReactNode;
  let cards: ReactNode;
  let controls: ReactNode;
  if (state.step === 'scale') {
    heading = <>Are <mark>you</mark> <span className="left">left</span> or <span className="right">right</span>?</>;
    cards = <>
      <Fact value={integer.format(data.source.records)} caption="People interviewed" />
      <Fact value={data.source.countries} caption={`Countries, ${data.source.years}`} />
    </>;
    controls = <ScaleControls score={score} shown={shown} onPlace={place}
      onConfirm={() => navigate({ type: 'confirm' })} />;
  } else if (state.step === 'among') {
    heading = <>You are at {score}, {placement(score).toLowerCase()}</>;
    cards = <>
      <Fact value={shown} caption="Shown at your mark" />
      <Fact value={country ? countryCount : data.dots.length}
        caption={country ? `Shown from ${data.countries.find(item => item.code === country)?.name}` : 'People shown on the arc'} />
    </>;
    controls = <CountryControls countries={data.countries} selected={country} dots={data.dots}
      onCountry={code => dispatch({ type: 'country', code })} onStart={() => navigate({ type: 'start' })} />;
  } else if (state.step === 'question' && question) {
    heading = question.prompt;
    controls = <QuestionControls question={question} onAnswer={option => navigate({ type: 'answer', option })} />;
  } else if (result) {
    const final = index === data.questions.length - 1;
    const answer = result.question.options[result.choice === 'a' ? 0 : 1];
    heading = <>{result.question.topic}: {answer === 'Agree' || answer === 'Disagree'
      ? `you ${answer.toLowerCase()}`
      : `you chose “${answer.toLowerCase()}”`}</>;
    controls = <ResultControls question={result.question} choice={result.choice} score={score} final={final}
      onContinue={() => navigate({ type: final ? 'restart' : 'next' })} />;
  }

  if (question) {
    cards = <>
      <Fact value={index + 1} caption={`Of ${data.questions.length} questions`} />
      <Fact value={question.topic} caption="Topic" />
    </>;
  }

  return <main hidden={showMethod} className={`story-page step-${step}${question ? ' step-comparison' : ''}`}>
    <section className="story-grid" aria-labelledby="story-heading">
      <header className="story-header">
        <Wordmark />
        <div className="header-controls">
          {(step === 'among' || question) && <button className="back-button" onClick={() => navigate({ type: 'back' })}>
            <Arrow back /> Back
          </button>}
          <span>{index < 0 ? 'Set-up' : `Question ${index + 1} of ${data.questions.length}`}</span>
        </div>
      </header>
      <h1 id="story-heading" tabIndex={-1} ref={headingRef} className="story-heading">{heading}</h1>
      <div className="story-visual">
        {cards && <div className="facts">{cards}</div>}
        <ArcChart dots={data.dots} score={score} country={country} comparison={question !== null} result={result}
          onPlace={step === 'scale' ? place : undefined} />
      </div>
      <div className="story-controls">{controls}</div>
    </section>
    <footer className="story-footer"><a href="#/about">Data &amp; methodology</a></footer>
  </main>;
}
