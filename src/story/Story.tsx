import { useEffect, useMemo, useReducer, useRef } from 'react';
import type { ReactNode, Ref } from 'react';
import type { Score, StoryData } from '../domain/model.ts';
import { ArcChart } from '../visualization/ArcChart.tsx';
import { Arrow, Continue, QuestionControls, ResultControls, ScaleControls, SurveyIntro, integer, placement, sharePercent } from './controls.tsx';
import { answerAlignment } from './answerAlignment.ts';
import { ExploreControls } from './ExploreControls.tsx';
import { matchesHighlights } from './highlights.ts';
import { sharedAnswer, summarizeGaps } from './takeaway.ts';
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
  const index = 'index' in state ? state.index : -1;
  const question = index >= 0 ? data.questions[index] : null;
  const result = state.step === 'result' && question ? {
    question,
    choice: state.option,
    alignment: answerAlignment(question.stats, state.option, state.score),
  } : null;
  const highlight = state.step === 'among' ? state.highlight : null;
  const matches = highlight
    ? data.dots.filter(dot => matchesHighlights(dot, highlight))
    : null;
  const shown = (matches ?? data.dots).filter(dot => dot.score === score).length;

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

  if (state.step === 'conclusion') {
    return <Conclusion data={data} headingRef={headingRef} hidden={showMethod}
      onBack={() => navigate({ type: 'back' })} onRestart={() => navigate({ type: 'restart' })} />;
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
    controls = <>
      <SurveyIntro />
      <Continue disabled={score === null} onClick={() => navigate({ type: 'confirm' })}>This is me</Continue>
    </>;
  } else if (state.step === 'among') {
    heading = <>You are at {state.score}, {placement(state.score).toLowerCase()}</>;
    cards = <>
      <Fact value={shown} caption={matches ? 'Matches in your sector' : 'Shown at your mark'} />
      <Fact value={matches?.length ?? data.dots.length} caption={matches ? 'Matches on the arc' : 'People shown on the arc'} />
    </>;
    controls = <ExploreControls countries={data.countries} dots={data.dots} selection={state.highlight}
      onSelect={selection => dispatch({ type: 'filter', selection })}
      onStart={() => navigate({ type: 'start' })} />;
  } else if (state.step === 'question' && question) {
    heading = question.prompt;
    controls = <QuestionControls question={question} onAnswer={option => navigate({ type: 'answer', option })} />;
  } else if (state.step === 'result' && result) {
    const final = index === data.questions.length - 1;
    const answer = result.question.options[result.choice === 'a' ? 0 : 1];
    heading = <>{result.question.topic}: {answer === 'Agree' || answer === 'Disagree'
      ? `you ${answer.toLowerCase()}`
      : `you chose “${answer.toLowerCase()}”`}</>;
    controls = <ResultControls question={result.question} choice={result.choice} score={state.score} alignment={result.alignment} final={final}
      onContinue={() => navigate({ type: 'next' })} />;
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
        <div className="story-plot">
          <ArcChart dots={data.dots} score={score} highlightedIds={matches && new Set(matches.map(dot => dot.id))}
            comparison={question !== null} result={result} onPlace={step === 'scale' ? place : undefined} />
          {step === 'scale' && <ScaleControls score={score} shown={shown} onPlace={place} />}
        </div>
      </div>
      <div className="story-controls">{controls}</div>
    </section>
    <footer className="story-footer"><a href="#/about">Data &amp; methodology</a></footer>
  </main>;
}

function Conclusion({ data, headingRef, hidden, onBack, onRestart }: {
  data: StoryData; headingRef: Ref<HTMLHeadingElement>; hidden: boolean;
  onBack: () => void; onRestart: () => void;
}) {
  const example = sharedAnswer(data.questions);
  const gaps = summarizeGaps(data.questions);
  let summary = 'People who place themselves on the same side can give different answers.';
  if (gaps) {
    const min = Math.round(gaps.min);
    const max = Math.round(gaps.max);
    const gap = min === max ? min : `${min}–${max}`;
    const questions = gaps.comparableCount === 1 ? 'question' : 'questions';
    const majority = gaps.sharedMajorityCount === 0
      ? 'The two sides had no majority answer in common.'
      : `Both sides had the same majority answer on ${gaps.sharedMajorityCount} of ${gaps.comparableCount}.`;
    summary = `The left–right gap was ${gap} percentage points across ${gaps.comparableCount} ${questions}. ${majority}`;
  }
  return <main hidden={hidden} className="story-page conclusion-page">
    <header className="story-header">
      <Wordmark />
      <button className="back-button" onClick={onBack}><Arrow back /> Back</button>
    </header>
    <section className={`conclusion-grid${example ? ' has-example' : ''}`} aria-labelledby="story-heading">
      <div className="conclusion-opening">
        <h1 id="story-heading" tabIndex={-1} ref={headingRef} className="story-heading">
          A label tells <mark>part</mark> of the story.
        </h1>
        <p>{summary}</p>
      </div>
      {example && <article className="conclusion-example">
        <h2>{example.question.prompt}</h2>
        <p>Chose “{example.question.options[example.choice === 'a' ? 0 : 1]}”</p>
        <div className="conclusion-shares">
          <div className="left"><strong>{sharePercent.format(example.left)}%</strong><span>On the left</span></div>
          <div className="right"><strong>{sharePercent.format(example.right)}%</strong><span>On the right</span></div>
        </div>
        <small className="conclusion-denominator">Weighted shares among people who chose either answer.</small>
      </article>}
      <div className="conclusion-close">
        <p>Before sorting people into camps, ask what they think about the issue.</p>
        <Continue onClick={onRestart}>Start over</Continue>
      </div>
    </section>
    <footer className="story-footer"><a href="#/about">Data &amp; methodology</a></footer>
  </main>;
}
