import { sides } from '../domain/model.ts';
import type { DisillusionedSummary } from '../domain/model.ts';
import { Continue, formatShare, integer } from './controls.tsx';
import './actTwo.css';

const groupLabels = { left: 'Left', centre: 'Centre (5)', right: 'Right', unplaced: 'No mark' };
const surveyedGroups = [...sides, 'unplaced'] as const;

export function UnplacedShare({ data }: { data: DisillusionedSummary }) {
  const percent = data.unplacedSharePercent;
  return <div className="unplaced-share">
    <div>
      <strong>{formatShare(percent)}</strong>
      <span>had no recorded<br />left–right mark</span>
    </div>
    <p>{integer.format(data.unplacedCount)} of {integer.format(data.eligibleTotalCount)} respondents across the countries in this story. The percentage is weighted.</p>
  </div>;
}

export const offArcQuestions = {
  trust: {
    prompt: 'How much do you trust your country’s parliament?',
    field: 'lowTrustPercent',
    answers: ['Low trust (0–4)', 'Trust rating of 5–10'],
    shortAnswers: ['Low trust', '5–10'],
    next: 'Look at political influence',
  },
  influence: {
    prompt: 'How much say do people like you have in what the government does?',
    field: 'noSayPercent',
    answers: ['Little or no say', 'Some say or more'],
    shortAnswers: ['Little or no say', 'Some or more'],
    next: 'Look at voting',
  },
  turnout: {
    prompt: 'Did you vote in the last national election?',
    field: 'votedPercent',
    answers: ['Voted', 'Did not vote'],
    shortAnswers: ['Voted', 'Did not vote'],
    next: 'One last question',
  },
} as const;
type OffArcQuestion = (typeof offArcQuestions)[keyof typeof offArcQuestions];

export function OffArcAnswerDetails({ question, data, onContinue }: {
  question: OffArcQuestion; data: DisillusionedSummary; onContinue: () => void;
}) {
  const share = data.groups.unplaced[question.field];
  return <div className="act-two-panel">
    <dl className="off-arc-answers" aria-label="Answers from people without a mark">
      {question.answers.map((answer, index) => <div key={answer}>
        <dt>{answer}</dt>
        <dd>{formatShare(share === null || index === 0 ? share : 100 - share)}</dd>
      </div>)}
    </dl>
    <details className="result-details">
      <summary>Compare with people on the arc</summary>
      <dl>{sides.map(side => <div key={side}>
        <dt>{groupLabels[side]}</dt><dd>{formatShare(data.groups[side][question.field])}</dd>
      </div>)}</dl>
    </details>
    <p className="act-note">{question.field === 'votedPercent'
      ? 'Weighted shares among eligible voters who answered yes or no.'
      : 'Weighted shares among respondents who answered this question.'}</p>
    {question.field === 'votedPercent' && <p>{(data.groups.unplaced.noSayPercent ?? 0) > 50 &&
      'Many said they had little or no say in politics. '}There’s one last question we can ask everyone.</p>}
    <Continue onClick={onContinue}>{question.next}</Continue>
  </div>;
}

export function understandingRange(data: DisillusionedSummary) {
  const shares = surveyedGroups.map(group => data.groups[group].understandingPercent)
    .filter((value): value is number => typeof value === 'number');
  if (shares.length !== surveyedGroups.length) return null;
  const low = formatShare(Math.min(...shares));
  const high = formatShare(Math.max(...shares));
  return low === high ? low : low.replace('%', '') + '–' + high;
}

export function UnderstandingResult({ data, answer, onContinue }: {
  data: DisillusionedSummary; answer: string; onContinue: () => void;
}) {
  return <div className="act-two-panel understanding-result">
    <p>You chose <strong>{answer}</strong>.</p>
    <h2>Who chose “More like me”?</h2>
    <div className="result-rows">
      {surveyedGroups.map(group => <div className={'result-row ' + group} key={group}>
        <span className="result-side">{groupLabels[group]}</span>
        <strong>{formatShare(data.groups[group].understandingPercent ?? null)}</strong>
        <div className="result-bar" aria-hidden="true">
          <span style={{ '--share': (data.groups[group].understandingPercent ?? 0) + '%' } as React.CSSProperties} />
        </div>
      </div>)}
    </div>
    <p className="act-note">Weighted shares who chose “More like me”. Grey dots illustrate the share of people without a recorded mark.</p>
    <Continue onClick={onContinue}>See the takeaway</Continue>
  </div>;
}
