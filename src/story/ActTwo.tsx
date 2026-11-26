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
    <div className="unplaced-track" aria-hidden="true"><span style={{ width: percent + '%' }} /></div>
    <p>{integer.format(data.unplacedCount)} of {integer.format(data.eligibleTotalCount)} respondents across the countries in this story. The percentage is weighted.</p>
  </div>;
}

export function EngagementDetails({ data, onContinue }: { data: DisillusionedSummary; onContinue: () => void }) {
  const { centreVotersNoSayPercent, centreNonVotersNoSayPercent, groups } = data;
  const offArc = groups.unplaced;
  const leastEngaged = sides.every(side => {
    const group = groups[side];
    return offArc.votedPercent !== null && group.votedPercent !== null && offArc.votedPercent < group.votedPercent &&
      offArc.lowTrustPercent !== null && group.lowTrustPercent !== null && offArc.lowTrustPercent > group.lowTrustPercent &&
      offArc.noSayPercent !== null && group.noSayPercent !== null && offArc.noSayPercent > group.noSayPercent;
  });
  return <div className="act-two-panel">
    <p>{leastEngaged
      ? 'People without a mark voted less often than any group on the arc. They more often reported low trust in parliament and little or no say in politics.'
      : 'Their other answers tell us how often they voted, how much they trusted parliament and how much say they felt they had.'}</p>
    <table className="act-table engagement-table">
      <thead><tr><th scope="col">Group</th><th scope="col">Voted</th><th scope="col">Low trust in parliament</th><th scope="col">Little or no say</th></tr></thead>
      <tbody>
        {surveyedGroups.map(group => <tr key={group} className={group}>
          <th scope="row">{groupLabels[group]}</th>
          <td>{formatShare(data.groups[group].votedPercent)}</td>
          <td>{formatShare(data.groups[group].lowTrustPercent)}</td>
          <td>{formatShare(data.groups[group].noSayPercent)}</td>
        </tr>)}
      </tbody>
    </table>
    <p className="act-note">These came from separate survey questions. The reasons for leaving the scale blank are unknown.</p>
    <details className="result-details">
      <summary>About these numbers</summary>
      <p>Voting shares include eligible voters. Low trust means 0–4 on the 0–10 scale.</p>
      {centreVotersNoSayPercent !== null && centreNonVotersNoSayPercent !== null && <p>
        Among people who chose 5, {formatShare(centreNonVotersNoSayPercent)} of non-voters reported little or no say, compared with {formatShare(centreVotersNoSayPercent)} of voters.
      </p>}
    </details>
    <Continue onClick={onContinue}>One last question</Continue>
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

export function QuadrantDetails({ data, onContinue }: { data: QuadrantSummary; onContinue: () => void }) {
  const rightAcrossCorners = quadrantKeys.every(key => (data.byGroup.right[key] ?? 0) > 0);
  const mixedCorners = quadrantKeys.every(key => sides.filter(side => (data.byGroup[side][key] ?? 0) > 0).length > 1);
  return <div className="act-two-panel">
    <p>The same dots move based on what people said about reducing income differences and admitting people from poorer countries outside Europe.</p>
    <table className="act-table quadrant-table">
      <thead><tr><th scope="col">Answer combination</th>{sides.map(side =>
        <th key={side} scope="col" className={side}>{side === 'centre' ? 'Centre' : groupLabels[side]}</th>)}</tr></thead>
      <tbody>{quadrantKeys.map(key => <tr key={key}>
        <th scope="row"><b>{combinations[key][0]}</b><small>{combinations[key][1]}</small></th>
        {sides.map(side => <td key={side} className={side}>{formatShare(data.byGroup[side][key])}</td>)}
      </tr>)}</tbody>
    </table>
    {mixedCorners && <p>People from different starting groups still share every corner.
      {rightAcrossCorners && ' People who placed themselves on the right show up in all four.'}</p>}
    <p className="act-note">Middle answers on income sit between the rows. Dots without both answers sit below. The table uses survey weights for {integer.format(data.totalCount)} people whose answers fit one of the four corners.</p>
    <Continue onClick={onContinue}>Who’s missing?</Continue>
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
    <p className="act-note">Weighted shares who chose “More like me”. The circle uses the same dots as the arc. The comparison also includes people without a mark.</p>
    <Continue onClick={onContinue}>See the takeaway</Continue>
  </div>;
}
