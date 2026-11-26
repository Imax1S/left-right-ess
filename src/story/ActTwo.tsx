import { quadrantKeys, sides } from '../domain/model.ts';
import type { DisillusionedSummary, QuadrantSummary } from '../domain/model.ts';
import { Continue, formatShare, integer } from './controls.tsx';
import './actTwo.css';

const groupLabels = { left: 'Left', centre: 'Centre (5)', right: 'Right', unplaced: 'No mark' };

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
  const centreVote = groups.centre.votedPercent;
  const outsideVote = groups.unplaced.votedPercent;
  const centreVotedLess = centreVote !== null && [groups.left, groups.right].every(group =>
    group.votedPercent !== null && centreVote < group.votedPercent);
  const outsideVotedLess = outsideVote !== null && sides.every(side =>
    groups[side].votedPercent !== null && outsideVote < groups[side].votedPercent);
  const mostOutsideFeltUnheard = (groups.unplaced.noSayPercent ?? 0) > 50;
  return <div className="act-two-panel">
    <p>{centreVotedLess && 'People who chose 5 voted less often than either side. '}
      {outsideVotedLess && 'People without a mark voted least often. '}
      {mostOutsideFeltUnheard && (outsideVotedLess
        ? 'Most of them said they had little or no say in politics.'
        : 'Most people without a mark said they had little or no say in politics.')}
      {!centreVotedLess && !outsideVotedLess && !mostOutsideFeltUnheard &&
        'Here is how voting and a sense of political influence varied across the scale and outside it.'}</p>
    <table className="act-table engagement-table">
      <thead><tr><th scope="col">Group</th><th scope="col">Voted</th><th scope="col">Little or no say</th></tr></thead>
      <tbody>
        {(['left', 'centre', 'right', 'unplaced'] as const).map(group => <tr key={group} className={group}>
          <th scope="row">{groupLabels[group]}</th>
          <td>{formatShare(data.groups[group].votedPercent)}</td>
          <td>{formatShare(data.groups[group].noSayPercent)}</td>
        </tr>)}
      </tbody>
    </table>
    {centreVotersNoSayPercent !== null && centreNonVotersNoSayPercent !== null && <p className="act-note">
      Among people who chose 5, {formatShare(centreNonVotersNoSayPercent)} of non-voters said they had little or no say, compared with {formatShare(centreVotersNoSayPercent)} of voters.
    </p>}
    <p className="act-note">Voting shares use answers from people eligible to vote. We only know whether a mark was recorded.</p>
    <Continue onClick={onContinue}>Try two axes</Continue>
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
    {rightAcrossCorners && <p>Look at the right-hand column. People who started with the same label show up in all four corners.</p>}
    <p className="act-note">Middle answers on income sit between the rows. Dots without both answers sit below. The table uses survey weights for {integer.format(data.totalCount)} people whose answers fit one of the four corners.</p>
    <Continue onClick={onContinue}>One last question</Continue>
  </div>;
}
