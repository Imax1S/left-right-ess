import { sides } from '../domain/model.ts';
import type { DisillusionedSummary } from '../domain/model.ts';
import { Continue, formatShare } from './controls.tsx';
import './actTwo.css';

const groupLabels = { left: 'Left', centre: 'Centre (5)', right: 'Right', unplaced: 'No mark' };
const surveyedGroups = [...sides, 'unplaced'] as const;

export function UnplacedShare({ data }: { data: DisillusionedSummary }) {
  const percent = data.unplacedSharePercent;
  return <div className="unplaced-share">
    <strong>{formatShare(percent)}</strong>
    <span>had no recorded<br />left–right mark</span>
  </div>;
}

export const offArcQuestions = {
  trust: {
    prompt: 'Did they trust parliament?',
    field: 'lowTrustPercent',
    answers: ['Low trust (0–4)', 'Trust rating of 5–10'],
    shortAnswers: ['Low trust', '5–10'],
    next: 'Look at political influence',
  },
  influence: {
    prompt: 'Did they feel they had a say?',
    field: 'noSayPercent',
    answers: ['Little or no say', 'Some say or more'],
    shortAnswers: ['Little or no say', 'Some or more'],
    next: 'Continue',
  },
} as const;
type OffArcQuestion = (typeof offArcQuestions)[keyof typeof offArcQuestions];

export function OffArcAnswerDetails({ question, data, onContinue }: {
  question: OffArcQuestion; data: DisillusionedSummary; onContinue: () => void;
}) {
  const share = data.groups.unplaced[question.field];
  const arcShares = sides.map(side => data.groups[side][question.field]).filter(value => value !== null);
  const maxOnArc = arcShares.length === sides.length ? Math.max(...arcShares) : null;
  return <div className="act-two-panel">
    <dl className="off-arc-answers" aria-label="Answers from people without a mark">
      {question.answers.map((answer, index) => <div key={answer}>
        <dt>{answer}</dt>
        <dd>{formatShare(share === null || index === 0 ? share : 100 - share)}</dd>
      </div>)}
    </dl>
    {share !== null && maxOnArc !== null && share > maxOnArc && <p>
      {question.field === 'lowTrustPercent' ? 'On the arc, at most ' + formatShare(maxOnArc) + ' reported low trust.'
        : 'On the arc, at most ' + formatShare(maxOnArc) + ' said they had little or no say.'}
    </p>}
    <details className="result-details">
      <summary>Compare with people on the arc</summary>
      <dl>{sides.map(side => <div key={side}>
        <dt>{groupLabels[side]}</dt><dd>{formatShare(data.groups[side][question.field])}</dd>
      </div>)}</dl>
    </details>
    <Continue onClick={onContinue}>{question.next}</Continue>
  </div>;
}

export function UnderstandingResult({ data, answer, onContinue }: {
  data: DisillusionedSummary; answer: string; onContinue: () => void;
}) {
  return <div className="act-two-panel">
    <p>You chose <strong>{answer}</strong>.</p>
    <details className="result-details">
      <summary>Compare all four groups</summary>
      <dl>{surveyedGroups.map(group => <div key={group}>
        <dt>{groupLabels[group]}</dt><dd>{formatShare(data.groups[group].understandingPercent ?? null)}</dd>
      </div>)}</dl>
      <p>Weighted shares who chose “More like me”.</p>
    </details>
    <Continue onClick={onContinue}>See the takeaway</Continue>
  </div>;
}
