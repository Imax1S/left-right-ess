import { sideOf } from './model.ts';
import type { DisillusionedSummary, EngagementFlags, EngagementTallies, Respondent } from './model.ts';

export function emptyEngagement(): EngagementTallies {
  return {
    count: 0, weight: 0, votedYesWeight: 0, votedWeight: 0, noSayWeight: 0, sayWeight: 0,
    lowTrustWeight: 0, trustWeight: 0, understandingYesWeight: 0, understandingWeight: 0,
  };
}

export function tallyEngagement(
  tallies: EngagementTallies, weight: number, { voted, noSay, lowTrust, understanding }: EngagementFlags,
) {
  tallies.count++;
  tallies.weight += weight;
  if (voted !== undefined) {
    tallies.votedWeight += weight;
    if (voted) tallies.votedYesWeight += weight;
  }
  if (noSay !== undefined) {
    tallies.sayWeight += weight;
    if (noSay) tallies.noSayWeight += weight;
  }
  if (lowTrust !== undefined) {
    tallies.trustWeight += weight;
    if (lowTrust) tallies.lowTrustWeight += weight;
  }
  if (understanding !== undefined) {
    tallies.understandingWeight += weight;
    if (understanding) tallies.understandingYesWeight += weight;
  }
}

function percent(weight: number, total: number) {
  return total > 0 ? 100 * weight / total : null;
}

export function summarizeEngagement(people: readonly Respondent[], unplaced: EngagementTallies): DisillusionedSummary {
  const totals = { left: emptyEngagement(), centre: emptyEngagement(), right: emptyEngagement(), unplaced };
  for (const person of people) {
    tallyEngagement(totals[sideOf(person.score)], person.weight, person.engagement ?? {});
  }
  const groups = Object.values(totals);
  const total = groups.reduce((sum, group) => sum + group.weight, 0);
  const understandingWeight = groups.reduce((sum, group) => sum + group.understandingWeight, 0);
  const understandingYesWeight = groups.reduce((sum, group) => sum + group.understandingYesWeight, 0);
  const shares = (group: EngagementTallies) => ({
    votedPercent: percent(group.votedYesWeight, group.votedWeight),
    noSayPercent: percent(group.noSayWeight, group.sayWeight),
    lowTrustPercent: percent(group.lowTrustWeight, group.trustWeight),
    understandingPercent: percent(group.understandingYesWeight, group.understandingWeight),
  });
  return {
    unplacedCount: unplaced.count,
    unplacedSharePercent: percent(unplaced.weight, total) ?? 0,
    eligibleTotalCount: people.length + unplaced.count,
    understandingPercent: percent(understandingYesWeight, understandingWeight),
    groups: {
      left: shares(totals.left), centre: shares(totals.centre), right: shares(totals.right), unplaced: shares(unplaced),
    },
  };
}
