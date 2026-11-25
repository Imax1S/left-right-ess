import { scores, sideLabels, sideOf, sides } from '../domain/model.ts';
import type { Choice, Score, StoryQuestion } from '../domain/model.ts';
import type { AnswerAlignment } from './answerAlignment.ts';

export const integer = new Intl.NumberFormat('en-GB');
export const sharePercent = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 });

export function placement(score: Score) {
  return score === 5 ? 'Centre' : score < 5 ? 'Left of centre' : 'Right of centre';
}

export function Arrow({ back = false }: { back?: boolean }) {
  return <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none"
    style={back ? { transform: 'rotate(180deg)' } : undefined}>
    <path d="M3 12h16m-6-5 6 5-6 5" stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

export function Continue({ children, onClick, disabled = false }: {
  children: string; onClick: () => void; disabled?: boolean;
}) {
  return <button className="continue" disabled={disabled} onClick={onClick}>{children}<Arrow /></button>;
}

export function SurveyIntro() {
  return <div className="survey-intro">
    <h2>European Social Survey</h2>
    <ol>
      <li>People placed themselves from left to right.</li>
      <li>Then they answered questions on social topics.</li>
      <li>Now you can do the same and compare.</li>
    </ol>
  </div>;
}

export function ScaleControls({ score, shown, onPlace }: {
  score: Score | null; shown: number; onPlace: (score: Score) => void;
}) {
  return <div className="scale-controls">
    <input className="scale-slider" data-side={score === null ? 'unplaced' : sideOf(score)}
      aria-label="Your place on the left–right scale"
      aria-valuetext={score === null ? 'Position not chosen' : `${score}, ${placement(score)}`}
      type="range" min="0" max={scores.length - 1} step="1"
      value={score === null ? scores.indexOf(5) : scores.indexOf(score)}
      onChange={event => onPlace(scores[event.currentTarget.valueAsNumber])}
      onClick={event => { if (score === null) onPlace(scores[event.currentTarget.valueAsNumber]); }} />
    <div className="scale-ticks" aria-label="Choose a position">
      {scores.map(value => <button key={value} onClick={() => onPlace(value)}
        aria-label={`Position ${value}`} aria-pressed={score === value}>{value}</button>)}
    </div>
    <div className="scale-sides" aria-hidden="true"><span>← Left</span><span>Centre</span><span>Right →</span></div>
    <div className="scale-readout">
      {score === null ? <p>You can drag the marker or use the slider.</p> : <>
        <strong className={sideOf(score)}>{score}</strong>
        <div><b>{placement(score)}</b><p>{shown} of the people shown share this mark</p></div>
      </>}
    </div>
  </div>;
}

const answerIcons = { a: 'm5 16 7 7L27 8', b: 'm8 8 16 16M24 8 8 24' } as const;

export function QuestionControls({ question, onAnswer }: {
  question: StoryQuestion; onAnswer: (choice: Choice) => void;
}) {
  return <div className="answer-options" role="group" aria-label="Choose your answer">
    {(['a', 'b'] as const).map(choice => <button key={choice} onClick={() => onAnswer(choice)}>
      <svg aria-hidden="true" width="29" height="29" viewBox="0 0 32 32" fill="none">
        <path d={answerIcons[choice]} stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{question.options[choice]}</span>
    </button>)}
    {question.options.neutral && <button className="answer-middle" onClick={() => onAnswer('neutral')}>
      {question.options.neutral}
    </button>}
  </div>;
}

export function formatShare(percent: number | null) {
  return percent === null ? '—' : sharePercent.format(percent) + '%';
}

export function ResultControls({ question, choice, alignment, final, onContinue }: {
  question: StoryQuestion; choice: Choice; alignment: AnswerAlignment;
  final: boolean; onContinue: () => void;
}) {
  const { gap, side: moreCommonOn } = alignment;
  const note = gap === null
    ? 'A comparison needs responses from at least two groups.'
    : moreCommonOn === null
      ? 'The highest shares are tied at the displayed precision.'
      : moreCommonOn === 'centre'
        ? 'Most common among people who chose 5.'
        : 'Most common on the ' + moreCommonOn + '.';

  return <>
    <section className="result-comparison" aria-labelledby="result-comparison-heading">
      <h2 id="result-comparison-heading">Who chose the same answer?</h2>
      <div className="result-rows">
        {sides.map(side => {
          const { percent } = question.stats[side][choice];
          return <div key={side} className={'result-row ' + side}>
            <span className="result-side">{sideLabels[side]}</span>
            <strong>{formatShare(percent)}</strong>
            <div className="result-bar" aria-hidden="true">
              <span style={{ '--share': (percent ?? 0) + '%' } as React.CSSProperties} />
            </div>
          </div>;
        })}
      </div>
      <p className="result-note">{note}</p>
      <details className="result-details">
        <summary>Response counts</summary>
        <dl>
          {sides.map(side => {
            const { count, total } = question.stats[side][choice];
            return <div key={side}>
              <dt>{sideLabels[side]}</dt>
              <dd>{total ? integer.format(count) + ' of ' + integer.format(total) : 'No included responses'}</dd>
            </div>;
          })}
        </dl>
        <p>Counts are unweighted. Percentages use survey weights.</p>
      </details>
    </section>
    <Continue onClick={onContinue}>{final ? 'See the takeaway' : 'Next question'}</Continue>
  </>;
}
