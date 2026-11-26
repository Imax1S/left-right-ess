import { quadrantKeys, sideOf } from './model.ts';
import type { Answer, DisillusionedSummary, EngagementFlags, EngagementTallies, QuadrantKey,
  QuadrantSummary, Respondent } from './model.ts';

export function emptyEngagement(): EngagementTallies {
  return { count: 0, weight: 0, votedYesWeight: 0, votedWeight: 0, noSayWeight: 0, sayWeight: 0 };
}

export function tallyEngagement(tallies: EngagementTallies, weight: number, { voted, noSay }: EngagementFlags) {
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
}

function percent(weight: number, total: number) {
  return total > 0 ? 100 * weight / total : null;
}

export function summarizeEngagement(people: readonly Respondent[], unplaced: EngagementTallies): DisillusionedSummary {
  const totals = { left: emptyEngagement(), centre: emptyEngagement(), right: emptyEngagement(), unplaced };
  const centreVoters = emptyEngagement();
  const centreNonVoters = emptyEngagement();
  for (const person of people) {
    const side = sideOf(person.score);
    const engagement = person.engagement ?? {};
    tallyEngagement(totals[side], person.weight, engagement);
    if (side === 'centre' && engagement.voted !== undefined) {
      tallyEngagement(engagement.voted ? centreVoters : centreNonVoters, person.weight, engagement);
    }
  }
  const total = Object.values(totals).reduce((sum, group) => sum + group.weight, 0);
  const shares = (group: EngagementTallies) => ({
    votedPercent: percent(group.votedYesWeight, group.votedWeight),
    noSayPercent: percent(group.noSayWeight, group.sayWeight),
  });
  return {
    unplacedCount: unplaced.count,
    unplacedSharePercent: percent(unplaced.weight, total) ?? 0,
    eligibleTotalCount: people.length + unplaced.count,
    groups: {
      left: shares(totals.left), centre: shares(totals.centre), right: shares(totals.right), unplaced: shares(unplaced),
    },
    centreNonVotersNoSayPercent: percent(centreNonVoters.noSayWeight, centreNonVoters.sayWeight),
    centreVotersNoSayPercent: percent(centreVoters.noSayWeight, centreVoters.sayWeight),
  };
}

export function quadrantFor(inequality?: Answer, migration?: Answer): QuadrantKey | null {
  if (migration !== 'a' && migration !== 'b') return null;
  if (inequality === 'a') return migration === 'a' ? 'reduceAllow' : 'reduceLimit';
  if (inequality === 'b') return migration === 'a' ? 'opposeAllow' : 'opposeLimit';
  return null;
}

export function summarizeQuadrants(people: readonly Respondent[]): QuadrantSummary | null {
  const empty = () => ({ reduceAllow: 0, reduceLimit: 0, opposeAllow: 0, opposeLimit: 0 });
  const totals = { left: empty(), centre: empty(), right: empty() };
  let totalCount = 0;
  for (const person of people) {
    const key = quadrantFor(person.answers.inequality, person.answers.migration);
    if (!key) continue;
    totals[sideOf(person.score)][key] += person.weight;
    totalCount++;
  }
  if (!totalCount) return null;
  const shares = (group: ReturnType<typeof empty>) => {
    const total = quadrantKeys.reduce((sum, key) => sum + group[key], 0);
    return {
      reduceAllow: percent(group.reduceAllow, total), reduceLimit: percent(group.reduceLimit, total),
      opposeAllow: percent(group.opposeAllow, total), opposeLimit: percent(group.opposeLimit, total),
    };
  };
  return {
    totalCount,
    byGroup: { left: shares(totals.left), centre: shares(totals.centre), right: shares(totals.right) },
  };
}
