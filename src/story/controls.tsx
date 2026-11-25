import { scores, sideOf } from '../domain/model.ts';
import type { Choice, Country, Dot, Score, StoryQuestion } from '../domain/model.ts';
import type { AnswerAlignment } from './answerAlignment.ts';

export const integer = new Intl.NumberFormat('en-GB');
export const sharePercent = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 });

export function placement(score: Score) {
  return score < 5 ? 'Left of centre' : 'Right of centre';
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

export function ScaleControls({ score, shown, onPlace, onConfirm }: {
  score: Score | null; shown: number; onPlace: (score: Score) => void; onConfirm: () => void;
}) {
  return <>
    <div className="survey-intro">
      <h2>European Social Survey</h2>
      <ol>
        <li>People placed themselves from left to right.</li>
        <li>Then they answered questions on social topics.</li>
        <li>Now you can do the same and compare.</li>
      </ol>
    </div>
    <div className="scale-controls">
      <div className="scale-readout">
        {score === null
          ? <div><b>Choose your position</b><p>Drag your marker, tap a sector or use the scale.</p></div>
          : <>
            <strong className={sideOf(score)}>{score}</strong>
            <div><b>{placement(score)}</b><p>{shown} of the people shown share this mark</p></div>
          </>}
      </div>
      <input className="scale-slider" data-side={score === null ? 'unplaced' : sideOf(score)}
        aria-label="Your place on the left–right scale"
        aria-valuetext={score === null ? 'Position not chosen' : `${score}, ${placement(score)}`}
        type="range" min="0" max={scores.length - 1} step="1"
        value={score === null ? scores.indexOf(4) : scores.indexOf(score)}
        onChange={event => onPlace(scores[event.currentTarget.valueAsNumber])}
        onClick={event => { if (score === null) onPlace(scores[event.currentTarget.valueAsNumber]); }} />
      <div className="scale-ticks" aria-label="Choose a position">
        {scores.map(value => <button key={value} onClick={() => onPlace(value)}
          aria-label={`Position ${value}`} aria-pressed={score === value}>{value}</button>)}
      </div>
      <div className="scale-sides" aria-hidden="true"><span>← Left</span><span>Right →</span></div>
    </div>
    <Continue onClick={onConfirm} disabled={score === null}>This is me</Continue>
  </>;
}

export function CountryControls({ countries, selected, dots, onCountry, onStart }: {
  countries: Country[]; selected: string | null; dots: Dot[];
  onCountry: (code: string) => void; onStart: () => void;
}) {
  const country = countries.find(item => item.code === selected);
  const available = dots.filter(dot => dot.country === selected);
  const left = available.filter(dot => sideOf(dot.score) === 'left').length;

  return <>
    <section className="country-picker" aria-labelledby="country-label">
      <h2 id="country-label">Your country <span>· Optional</span></h2>
      <div className="country-options" role="group" aria-labelledby="country-label">
        {countries.map(item => <button key={item.code} aria-pressed={item.code === selected}
          onClick={() => onCountry(item.code)}>{item.name}</button>)}
      </div>
      <p className="country-note" aria-live="polite">
        {country ? available.length
          ? `${country.name}: ${available.length} shown · ${left} left, ${available.length - left} right.`
          : `No one from ${country.name} in the ${dots.length} people shown.`
          : 'Choose a country to see its participants on the arc.'}
      </p>
    </section>
    <Continue onClick={onStart}>To the first question</Continue>
  </>;
}

export function QuestionControls({ question, onAnswer }: {
  question: StoryQuestion; onAnswer: (choice: Choice) => void;
}) {
  return <div className="answer-options" role="group" aria-label="Choose your answer">
    {question.options.map((label, index) => <button key={index}
      onClick={() => onAnswer(index === 0 ? 'a' : 'b')}>
      <svg aria-hidden="true" width="33" height="33" viewBox="0 0 32 32" fill="none">
        <path d={index === 0 ? 'm5 16 7 7L27 8' : 'm8 8 16 16M24 8 8 24'} stroke="currentColor"
          strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{label}</span>
    </button>)}
  </div>;
}

export function ResultControls({ question, choice, score, alignment, final, onContinue }: {
  question: StoryQuestion; choice: Choice; score: Score; alignment: AnswerAlignment;
  final: boolean; onContinue: () => void;
}) {
  const startSide = sideOf(score);
  const { gap } = alignment;
  const note = alignment.side === null
    ? 'Both sides chose this answer about as often.'
    : alignment.side === startSide
      ? `This answer was more common on the ${startSide}, where you placed yourself.`
      : `You placed yourself on the ${startSide}. This answer was more common on the ${alignment.side}.`;
  return <>
    <div className="result-rows">
      {(['left', 'right'] as const).map(side => {
        const share = question.stats[side][choice];
        return <div key={side} className={`result-row ${side}`}>
          <strong>{share.percent === null ? '—' : `${sharePercent.format(share.percent)}%`}</strong>
          <div><b>of people on the {side} chose this answer</b>
            <small>{share.total ? `${integer.format(share.count)} of ${integer.format(share.total)} responses · unweighted count`
              : 'No eligible respondents in this group'}</small>
          </div>
          <div className="result-bar" aria-hidden="true"><span style={{ '--share': `${share.percent ?? 0}%` } as React.CSSProperties} /></div>
        </div>;
      })}
    </div>
    {gap !== null && <p className="result-note">
      {note}{gap > 0 && ` The groups were ${sharePercent.format(gap)} percentage points apart.`}
    </p>}
    <Continue onClick={onContinue}>{final ? 'Start over' : 'Next question'}</Continue>
  </>;
}
