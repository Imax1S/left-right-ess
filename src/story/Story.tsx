import { useEffect, useMemo, useReducer, useRef } from 'react';
import type { ReactNode, Ref } from 'react';
import { sideLabels, sideOf, sides } from '../domain/model.ts';
import type { Choice, Score, StoryData, StoryQuestion } from '../domain/model.ts';
import { ArcChart, ReaderGlyph } from '../visualization/ArcChart.tsx';
import { Arrow, Continue, QuestionControls, ResultControls, ScaleControls, SurveyIntro, formatShare, integer } from './controls.tsx';
import { answerAlignment } from './answerAlignment.ts';
import { ExploreControls } from './ExploreControls.tsx';
import { matchesHighlights } from './highlights.ts';
import { groupMatch, takeawayExamples } from './takeaway.ts';
import { createSessionReducer, initialSession } from './session.ts';
import type { Answers } from './session.ts';

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
    return <Conclusion data={data} score={state.score} answers={state.answers} headingRef={headingRef} hidden={showMethod}
      onBack={() => navigate({ type: 'back' })} onRestart={() => navigate({ type: 'restart' })} />;
  }

  let heading: ReactNode;
  let cards: ReactNode;
  let controls: ReactNode;
  if (state.step === 'scale') {
    heading = <>Where do <mark>you</mark> place yourself?</>;
    cards = <>
      <Fact value={integer.format(data.source.records)} caption="People interviewed" />
      <Fact value={data.source.countries} caption={`Countries, ${data.source.years}`} />
    </>;
    controls = <>
      <SurveyIntro />
      <Continue disabled={score === null} onClick={() => navigate({ type: 'confirm' })}>This is me</Continue>
    </>;
  } else if (state.step === 'among') {
    heading = 'Get to know your sector';
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
    const answer = result.question.options[result.choice];
    heading = answer === 'Agree' || answer === 'Disagree'
      ? 'You ' + answer.toLowerCase()
      : 'You chose “' + (answer ?? '') + '”';
    controls = <ResultControls question={result.question} choice={result.choice} alignment={result.alignment} final={final}
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

function AnswerShares({ question, choice }: { question: StoryQuestion; choice: Choice }) {
  return <dl className="conclusion-shares">
    {sides.map(side => <div key={side} className={side}>
      <dt>{sideLabels[side]}</dt>
      <dd>{formatShare(question.stats[side][choice].percent)}</dd>
    </div>)}
  </dl>;
}

function Conclusion({ data, score, answers, headingRef, hidden, onBack, onRestart }: {
  data: StoryData; score: Score; answers: Answers; headingRef: Ref<HTMLHeadingElement>; hidden: boolean;
  onBack: () => void; onRestart: () => void;
}) {
  const { agreement, widest } = takeawayExamples(data.questions);
  const { matches, compared } = groupMatch(data.questions, score, answers);
  const group = sideLabels[sideOf(score)];
  const patterns = data.responsePatterns;
  return <main hidden={hidden} className="story-page conclusion-page">
    <header className="story-header">
      <Wordmark />
      <button className="back-button" onClick={onBack}><Arrow back /> Back</button>
    </header>
    <section className="conclusion-opening" aria-labelledby="story-heading">
      <h1 id="story-heading" tabIndex={-1} ref={headingRef} className="story-heading">
        A label tells <mark>part</mark> of the story.
      </h1>
      <div className="conclusion-summary">
        <div className="conclusion-mark">
          <svg viewBox="-20 -20 40 40" aria-hidden="true"><g className="reader-marker"><ReaderGlyph score={score} /></g></svg>
          <div><span>Your starting group</span><b>{group}{score !== 5 && ' · Mark ' + score}</b></div>
        </div>
        {compared > 0 ? <>
          <p className="conclusion-score"><strong>{matches}</strong> <span>of {compared}</span></p>
          <p>Answers that matched the most common choice in your starting group.</p>
          <div className="conclusion-dots" aria-hidden="true">
            {Array.from({ length: compared }, (_, i) => <i className={i < matches ? 'is-match' : ''} key={i} />)}
          </div>
        </> : <p>There are no comparable responses in your starting group.</p>}
      </div>
    </section>
    {patterns && <section className="conclusion-context" aria-labelledby="conclusion-context-heading">
      <h2 id="conclusion-context-heading">How others answered</h2>
      <div className="conclusion-cards">
        <article className="conclusion-card conclusion-stat">
          <h3>Matching on every question</h3>
          <strong>{formatShare(patterns.fullMatchPercent)}</strong>
          <p>chose their group’s most common answer on every question.</p>
        </article>
        {patterns.sharedAcrossGroupsPercent !== null && <article className="conclusion-card conclusion-stat">
          <h3>Same answers across groups</h3>
          <strong>{formatShare(patterns.sharedAcrossGroupsPercent)}</strong>
          <p>gave a set of answers that appeared in all three groups.</p>
        </article>}
      </div>
      <p className="conclusion-context-note">Weighted shares among {integer.format(patterns.count)} ESS respondents who chose a displayed answer on every question.</p>
    </section>}
    <details className="conclusion-details">
      <summary>See the full breakdown</summary>
      <section aria-labelledby="personal-answers">
        <h2 id="personal-answers">Your answers, side by side</h2>
        <p className="conclusion-intro">The percentages show how many people in each group chose the same answer as you.</p>
        <div className="conclusion-cards">
          {data.questions.map((question, index) => {
            const choice = answers[index];
            if (choice === undefined) return null;
            return <article key={question.id} className="conclusion-card">
              <h3>{question.topic}</h3>
              <p>You chose <b>“{question.options[choice]}”</b></p>
              <AnswerShares question={question} choice={choice} />
            </article>;
          })}
        </div>
      </section>
      {(agreement || widest) && <section aria-labelledby="group-patterns">
        <h2 id="group-patterns">Where the groups agreed and differed</h2>
        <div className="conclusion-cards">
          {[
            { title: 'A majority in every group', example: agreement },
            { title: 'The widest gap', example: widest },
          ].map(({ title, example }) => example && <article key={title} className="conclusion-card">
            <h3>{title}</h3>
            <p>{example.question.topic} · “{example.question.options[example.choice]}”</p>
            <AnswerShares question={example.question} choice={example.choice} />
          </article>)}
        </div>
      </section>}
    </details>
    <div className="conclusion-close">
      <p>Across these questions, a political label gave a rough clue about what someone might say. Ask them about the issue to learn where they stand.</p>
      <Continue onClick={onRestart}>Start over</Continue>
    </div>
    <footer className="story-footer"><a href="#/about">Data &amp; methodology</a></footer>
  </main>;
}
