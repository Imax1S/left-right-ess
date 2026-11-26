import { quadrantKeys, sides } from '../domain/model.ts';
import type { DisillusionedSummary, QuadrantSummary } from '../domain/model.ts';
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
    next: 'Look at political influence',
  },
  influence: {
    prompt: 'How much say do people like you have in what the government does?',
    field: 'noSayPercent',
    answers: ['Little or no say', 'Some say or more'],
    next: 'Look at voting',
  },
  turnout: {
    prompt: 'Did you vote in the last national election?',
    field: 'votedPercent',
    answers: ['Voted', 'Did not vote'],
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

const combinations = {
  reduceAllow: ['Reduce the gap', 'Allow many / some'],
  reduceLimit: ['Reduce the gap', 'Allow a few / none'],
  opposeAllow: ['Oppose reducing', 'Allow many / some'],
  opposeLimit: ['Oppose reducing', 'Allow a few / none'],
} as const;

export function QuadrantLegend() {
  return <div className="quadrant-legend">
    <span className="left">Left</span><span className="centre">Centre (5)</span><span className="right">Right</span>
  </div>;
}

type AxisQuestions = { migration: string; inequality: string };

export function QuadrantGuide({ migration, inequality }: AxisQuestions) {
  return <dl className="quadrant-guide" aria-label="Questions on each axis">
    <div><dt>Across · Immigration</dt><dd>{migration}</dd></div>
    <div><dt>Up and down · Income gap</dt><dd>{inequality}</dd></div>
  </dl>;
}

export function QuadrantDetails({ data, axes, onContinue }: {
  data: QuadrantSummary; axes: AxisQuestions; onContinue: () => void;
}) {
  const mixedCorners = quadrantKeys.every(key => sides.filter(side => (data.byGroup[side][key] ?? 0) > 0).length > 1);
  return <div className="act-two-panel">
    <p>{mixedCorners
      ? 'People from different starting groups still share every corner.'
      : 'The same people are now grouped by their answers on income and immigration.'}</p>
    <QuadrantGuide {...axes} />
    <p className="act-note">Immigration answers set the column. People who agreed to reduce the income gap go above the dotted line, people who disagreed go below, and middle answers stay between the two rows.</p>
    <details className="result-details quadrant-numbers">
      <summary>See the numbers</summary>
      <table className="act-table quadrant-table">
        <thead><tr><th scope="col">Answer combination</th>{sides.map(side =>
          <th key={side} scope="col" className={side}>{side === 'centre' ? 'Centre' : groupLabels[side]}</th>)}</tr></thead>
        <tbody>{quadrantKeys.map(key => <tr key={key}>
          <th scope="row"><b>{combinations[key][0]}</b><small>{combinations[key][1]}</small></th>
          {sides.map(side => <td key={side} className={side}>{formatShare(data.byGroup[side][key])}</td>)}
        </tr>)}</tbody>
      </table>
      <p className="act-note">Dots without both answers sit below the grid. The table uses survey weights for {integer.format(data.totalCount)} people whose answers fit one of the four corners.</p>
    </details>
    <Continue onClick={onContinue}>Continue</Continue>
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
