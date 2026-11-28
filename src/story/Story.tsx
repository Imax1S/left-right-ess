import { useEffect, useMemo, useReducer, useRef } from 'react';
import type { ReactNode } from 'react';
import { sideLabels, sideOf, sides } from '../domain/model.ts';
import type { Choice, Score, StoryData, StoryQuestion } from '../domain/model.ts';
import { ArcChart, ReaderGlyph } from '../visualization/ArcChart.tsx';
import { Arrow, Continue, QuestionControls, ResultControls, ScaleControls, SurveyIntro, YesControl,
  formatShare, integer } from './controls.tsx';
import { answerAlignment } from './answerAlignment.ts';
import { ExploreControls } from './ExploreControls.tsx';
import { OffArcAnswerDetails, offArcQuestions, UnderstandingComparison, UnderstandingResult } from './ActTwo.tsx';
import { matchesHighlights } from './highlights.ts';
import { ShareTakeaway } from './ShareTakeaway.tsx';
import { groupMatch, takeawayExamples } from './takeaway.ts';
import { createSessionReducer, initialSession, isActTwoStep, isOffArcStep } from './session.ts';
import type { Answers } from './session.ts';

export function Wordmark() {
  return <span className="wordmark"><b>Left.</b> <b>Right.</b></span>;
}

function Fact({ value, caption }: { value: ReactNode; caption: string }) {
  return <div className="fact"><strong>{value}</strong><span>{caption}</span></div>;
}

export function Story({ data, showMethod }: { data: StoryData; showMethod: boolean }) {
  const hasActTwo = Boolean(data.disillusioned);
  const reduce = useMemo(() => createSessionReducer(
    data.questions.map(question => question.id), data.countries.map(country => country.code), hasActTwo,
  ), [data, hasActTwo]);
  const [state, dispatch] = useReducer(reduce, initialSession);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusOnChange = useRef(false);
  const { step, score } = state;
  const actTwoScreen = isActTwoStep(step);
  const offArcQuestion = step === 'trust' || step === 'influence' ? offArcQuestions[step] : null;
  const index = 'index' in state ? state.index : step === 'conclusion' ? data.questions.length - 1 : -1;
  const question = index >= 0 ? data.questions[index] : null;
  const voteQuestion = hasActTwo && question?.id === 'vote';
  const comparisonLayout = question !== null || actTwoScreen;
  const result = state.step === 'result' && question ? {
    question,
    choice: state.option,
    alignment: answerAlignment(question.stats, state.option, state.score),
  } : null;
  const closingQuestion = hasActTwo && question?.id === 'understanding';
  const closingCircle = closingQuestion && (result !== null || step === 'conclusion');
  const showVotingCards = voteQuestion || step === 'missing-prompt';
  const hasVotingCardSlot = showVotingCards || actTwoScreen || closingQuestion;
  const palette = isOffArcStep(step) ? ' is-monochrome'
    : closingCircle ? ' is-closing-result' : closingQuestion ? ' is-closing-question' : '';
  const outside = data.disillusioned;
  const understandingShare = outside?.understandingPercent ?? null;
  const understandingCircle = closingCircle ? {
    share: understandingShare === null ? null : formatShare(understandingShare),
    countries: data.countries.length,
  } : undefined;
  const offArc = outside && (isOffArcStep(step) || closingQuestion) ? {
    count: Math.round(data.dots.length * outside.unplacedSharePercent / 100),
    answerShare: offArcQuestion ? outside.groups.unplaced[offArcQuestion.field]
      : closingCircle ? outside.groups.unplaced.understandingPercent : undefined,
  } : undefined;
  const highlight = state.step === 'among' ? state.highlight : null;
  const matches = highlight
    ? data.dots.filter(dot => matchesHighlights(dot, highlight))
    : null;
  const shown = (matches ?? data.dots).filter(dot => dot.score === score).length;

  useEffect(() => {
    if (showMethod || !focusOnChange.current) return;
    headingRef.current?.focus({ preventScroll: true });
    if (step !== 'result' || closingCircle) {
      const animateScroll = step === 'engagement' &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: animateScroll ? 'smooth' : 'instant' });
    }
  }, [step, index, showMethod, closingCircle]);

  function navigate(action: Parameters<typeof dispatch>[0]) {
    focusOnChange.current = true;
    dispatch(action);
  }

  function place(value: Score) {
    if (value === score) return;
    dispatch({ type: 'place', score: value });
    navigator.vibrate?.(10);
  }

  const takeawayHeading = <>A label tells <mark>part</mark> of the story.</>;
  const takeaway = state.step === 'conclusion' && <Takeaway data={data} score={state.score} answers={state.answers}
    openingHeading={closingCircle ? undefined : <h1 id="story-heading" tabIndex={-1} ref={headingRef}
      className="story-heading">{takeawayHeading}</h1>}
    onRestart={() => navigate({ type: 'restart' })} />;
  if (state.step === 'conclusion' && !closingCircle) {
    return <main hidden={showMethod} className={hasActTwo
      ? 'story-page conclusion-page is-closing-result' : 'story-page conclusion-page'}>
      <header className="story-header">
        <Wordmark />
        <button className="back-button" onClick={() => navigate({ type: 'back' })}><Arrow back /> Back</button>
      </header>
      {takeaway}
      <footer className="story-footer"><a href="#/about">Data &amp; methodology</a></footer>
    </main>;
  }

  let heading: ReactNode;
  let cards: ReactNode;
  let controls: ReactNode;
  const next = () => navigate({ type: 'next' });
  if (state.step === 'scale') {
    heading = <>Where do <mark>you</mark> place yourself?</>;
    cards = <>
      <Fact value={integer.format(data.disillusioned?.eligibleTotalCount ?? data.eligibleCount)} caption="Respondents in this story" />
      <Fact value={data.countries.length} caption={`Countries, ${data.source.years}`} />
    </>;
    controls = <>
      <SurveyIntro />
      <Continue disabled={score === null} onClick={() => navigate({ type: 'confirm' })}>This is me</Continue>
    </>;
  } else if (state.step === 'among') {
    heading = 'Get to know your sector';
    cards = <>
      <Fact value={shown} caption={matches ? 'Matches in your sector' : 'Shown at your mark'} />
      <Fact value={matches?.length ?? data.dots.length} caption={matches ? 'Matches shown' : 'People shown'} />
    </>;
    controls = <ExploreControls countries={data.countries} dots={data.dots} selection={state.highlight}
      onSelect={selection => dispatch({ type: 'filter', selection })}
      onStart={() => navigate({ type: 'start' })} />;
  } else if (state.step === 'question' && question) {
    heading = question.prompt;
    controls = <QuestionControls question={question} onAnswer={option => navigate({ type: 'answer', option })} />;
  } else if (step === 'conclusion') {
    heading = takeawayHeading;
    controls = takeaway;
  } else if (closingCircle && result && data.disillusioned) {
    heading = 'Understanding is common ground.';
    controls = <UnderstandingResult answer={result.question.options[result.choice] ?? ''}
      onContinue={next} />;
  } else if (state.step === 'result' && result) {
    const final = index === data.questions.length - 1;
    const answer = result.question.options[result.choice];
    heading = voteQuestion
      ? result.choice === 'a'
        ? 'You voted in the last election.'
        : 'You didn’t vote in the last election.'
      : answer === 'Agree' || answer === 'Disagree'
      ? 'You ' + answer.toLowerCase()
      : 'You chose “' + (answer ?? '') + '”';
    controls = <ResultControls question={result.question} choice={result.choice} alignment={result.alignment}
      continueLabel={final ? 'See the takeaway' : voteQuestion ? 'Continue' : 'Next question'} onContinue={next} />;
  } else if (state.step === 'missing-prompt') {
    heading = 'Are we missing anyone?';
    controls = <YesControl onYes={next} />;
  } else if (state.step === 'engagement' && offArc) {
    heading = 'They were outside the scale.';
    controls = <div className="act-two-panel">
      <p className="off-arc-stat">
        <strong>{offArc.count}</strong>{' '}
        <span>of {data.dots.length} dots represent people who gave no left–right answer.</span>
      </p>
      <p>We know how they answered other questions. Let’s start with trust in parliament.</p>
      <Continue onClick={next}>Look at trust</Continue>
    </div>;
  } else if (offArcQuestion && data.disillusioned) {
    heading = offArcQuestion.prompt;
    controls = <OffArcAnswerDetails question={offArcQuestion} data={data.disillusioned} onContinue={next} />;
  } else if (step === 'listening-bridge') {
    heading = 'What do we share?';
    controls = <div className="act-two-panel">
      <p>We’ve seen where people place themselves and how much say they feel they have. One last question asks what matters to them when they disagree.</p>
      <Continue onClick={next}>One last question</Continue>
    </div>;
  }

  if (question && !hasVotingCardSlot) {
    cards = <>
      <Fact value={index + 1} caption={`Of ${data.questions.length} questions`} />
      <Fact value={question.topic} caption="Topic" />
    </>;
  }

  return <main hidden={showMethod} className={`story-page step-${step}${comparisonLayout ? ' step-comparison' : ''}${hasVotingCardSlot ? ' step-act-two' : ''}${voteQuestion && result ? ' step-vote-result' : ''}${palette}`}>
    <section className="story-grid" aria-labelledby="story-heading">
      <header className="story-header">
        <Wordmark />
        <div className="header-controls">
          {(step === 'among' || question || actTwoScreen) && <button className="back-button" onClick={() => navigate({ type: 'back' })}>
            <Arrow back /> Back
          </button>}
          {!actTwoScreen && step !== 'conclusion' && <span>{index < 0 ? 'Set-up' : `Question ${index + 1} of ${data.questions.length}`}</span>}
        </div>
      </header>
      <h1 id="story-heading" tabIndex={-1} ref={headingRef} className="story-heading">{heading}</h1>
      <div className="story-visual">
        <div className="story-plot">
          <ArcChart dots={data.dots} score={score} highlightedIds={matches && new Set(matches.map(dot => dot.id))}
            result={result} offArc={offArc} understandingCircle={understandingCircle}
            onPlace={step === 'scale' ? place : undefined} />
          {step === 'scale' && <ScaleControls score={score} shown={shown} onPlace={place} />}
        </div>
        {hasVotingCardSlot
          ? <div className={showVotingCards ? 'voting-cards is-visible' : 'voting-cards'} aria-hidden={!showVotingCards}>
            <div><div className="facts">
              <Fact value={data.questions.findIndex(item => item.id === 'vote') + 1}
                caption={`Of ${data.questions.length} questions`} />
              <Fact value="Voting" caption="Topic" />
            </div></div>
          </div>
          : cards && <div className="facts">{cards}</div>}
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

function Takeaway({ data, score, answers, openingHeading, onRestart }: {
  data: StoryData; score: Score; answers: Answers; openingHeading?: ReactNode;
  onRestart: () => void;
}) {
  const { agreement, widest } = takeawayExamples(data.questions);
  const { matches, compared } = groupMatch(data.questions, score, answers);
  const startingSide = sideOf(score);
  const politicalGroup = { left: 'Left (0–4)', centre: 'Centre (5)', right: 'Right (6–10)' }[startingSide];
  const groupPhrase = startingSide === 'centre' ? 'in the centre' : 'on the ' + startingSide;
  const patterns = data.responsePatterns;
  const groupFullMatch = patterns?.fullMatchPercentByGroup?.[startingSide] ?? null;
  const summary = <div className="conclusion-summary">
    <div className="conclusion-mark">
      <svg viewBox="-20 -20 40 40" aria-hidden="true"><g className="reader-marker"><ReaderGlyph score={score} /></g></svg>
      <div><span>Your political group</span><b>{politicalGroup}</b></div>
    </div>
    {compared > 0 ? <>
      <p className="conclusion-score"><strong>{matches}</strong> <span>of {compared}</span></p>
      <p>of your answers matched the most common choice among people {groupPhrase}.</p>
      <div className="conclusion-dots" aria-hidden="true">
        {Array.from({ length: compared }, (_, i) => <i className={i < matches ? 'is-match' : ''} key={i} />)}
      </div>
    </> : <p>There are no comparable responses in your starting group.</p>}
  </div>;
  return <>
    {openingHeading ? <section className="conclusion-opening" aria-labelledby="story-heading">
      {openingHeading}
      {summary}
    </section> : summary}
    {patterns && <section className="conclusion-context" aria-labelledby="conclusion-context-heading">
      <div className="conclusion-context-header">
        <h2 id="conclusion-context-heading">How others answered</h2>
        <ShareTakeaway result={matches + ' of ' + compared} group={politicalGroup} stats={[
          ...(groupFullMatch === null ? [] : [{ title: 'All the group’s top answers', value: formatShare(groupFullMatch) }]),
          ...(patterns.sharedAcrossGroupsPercent === null ? [] : [{
            title: 'Exact matches across groups', value: formatShare(patterns.sharedAcrossGroupsPercent),
          }]),
        ]} />
      </div>
      <div className="conclusion-cards">
        {groupFullMatch !== null && <article className="conclusion-card conclusion-stat">
          <h3>All the group’s top answers</h3>
          <strong>{formatShare(groupFullMatch)}</strong>
          <p>of people {groupPhrase} picked their group’s most common answer on all {data.questions.length} questions.</p>
        </article>}
        {patterns.sharedAcrossGroupsPercent !== null && <article className="conclusion-card conclusion-stat">
          <h3>An exact match across groups</h3>
          <strong>{formatShare(patterns.sharedAcrossGroupsPercent)}</strong>
          <p>of respondents answered every question the same way as someone in each of the other two groups.</p>
        </article>}
      </div>
      <p className="conclusion-context-note">Weighted results based on {integer.format(patterns.count)} ESS respondents who chose a displayed answer on every question.</p>
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
      {data.disillusioned && <UnderstandingComparison data={data.disillusioned} />}
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
      <Continue onClick={onRestart}>Start over</Continue>
    </div>
  </>;
}
