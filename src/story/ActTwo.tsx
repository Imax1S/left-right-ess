import { sides } from '../domain/model.ts';
import type { DisillusionedSummary } from '../domain/model.ts';
import { Continue, formatShare } from './controls.tsx';
import './actTwo.css';

const groupLabels = { left: 'Left', centre: 'Centre (5)', right: 'Right', unplaced: 'No mark' };
const surveyedGroups = [...sides, 'unplaced'] as const;

export const offArcQuestions = {
  trust: {
    prompt: 'Did they trust parliament?',
    field: 'lowTrustPercent',
    caption: 'reported low trust in parliament.',
    next: 'Look at political influence',
  },
  influence: {
    prompt: 'Did they feel they had a say?',
    field: 'noSayPercent',
    caption: 'said they had little or no say in what the government does.',
    next: 'Continue',
  },
} as const;
type OffArcQuestion = (typeof offArcQuestions)[keyof typeof offArcQuestions];

export function OffArcAnswerDetails({ question, data, onContinue }: {
  question: OffArcQuestion; data: DisillusionedSummary; onContinue: () => void;
}) {
  const share = data.groups.unplaced[question.field];
  return <div className="act-two-panel">
    {share === null ? <p>No recorded answers for this group.</p> : <p className="off-arc-stat">
      <strong>{formatShare(share)}</strong>{' '}
      <span>{question.caption}</span>
    </p>}
    <Continue onClick={onContinue}>{question.next}</Continue>
  </div>;
}

export function UnderstandingResult({ answer, onContinue }: {
  answer: string; onContinue: () => void;
}) {
  return <div className="act-two-panel">
    <p>You chose <strong>{answer}</strong>.</p>
    <Continue onClick={onContinue}>See the takeaway</Continue>
  </div>;
}

export function UnderstandingComparison({ data }: { data: DisillusionedSummary }) {
  return <section className="result-details" aria-labelledby="understanding-comparison">
    <h2 id="understanding-comparison">Understanding others across groups</h2>
    <dl>{surveyedGroups.map(group => <div key={group}>
      <dt>{groupLabels[group]}</dt><dd>{formatShare(data.groups[group].understandingPercent)}</dd>
    </div>)}</dl>
    <p>Weighted shares who said the description was somewhat to very much like them.</p>
  </section>;
}
