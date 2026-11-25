import { questionChoices, sideOf, sides } from './model.ts';
import type { Choice, Respondent, ResponsePatterns, Side, StoryQuestion } from './model.ts';

export function mostCommonChoices(question: StoryQuestion, side: Side): Choice[] {
  const observed = questionChoices(question).flatMap(choice => {
    const share = question.stats[side][choice].percent;
    return share === null ? [] : [{ choice, rounded: Math.round(share * 10) }];
  });
  const highest = Math.max(...observed.map(({ rounded }) => rounded));
  return observed.filter(({ rounded }) => rounded === highest).map(({ choice }) => choice);
}

export function summarizeResponsePatterns(people: readonly Respondent[], questions: readonly StoryQuestion[]): ResponsePatterns | null {
  const patterns = new Map<string, { weight: number; sides: Set<Side> }>();
  const empty = () => ({ weight: 0, fullMatchWeight: 0 });
  const groups = { left: empty(), centre: empty(), right: empty() };
  const typical = new Map(sides.map(side => [side, questions.map(question => mostCommonChoices(question, side))]));
  const options = questions.map(questionChoices);

  let count = 0;
  let totalWeight = 0;
  let fullMatchWeight = 0;
  for (const person of people) {
    const answers = questions.map((question, index) =>
      options[index].find(choice => choice === person.answers[question.id]));
    if (!answers.every((answer): answer is Choice => answer !== undefined)) continue;

    count++;
    totalWeight += person.weight;
    const side = sideOf(person.score);
    const group = groups[side];
    group.weight += person.weight;
    const common = typical.get(side)!;
    if (answers.every((answer, index) => common[index].includes(answer))) {
      group.fullMatchWeight += person.weight;
      fullMatchWeight += person.weight;
    }

    const key = answers.join(',');
    const pattern = patterns.get(key) ?? { weight: 0, sides: new Set<Side>() };
    pattern.weight += person.weight;
    pattern.sides.add(side);
    patterns.set(key, pattern);
  }

  if (totalWeight <= 0) return null;
  let sharedWeight = 0;
  for (const pattern of patterns.values()) {
    if (pattern.sides.size === sides.length) sharedWeight += pattern.weight;
  }
  const groupPercent = (side: Side) => {
    const { weight, fullMatchWeight } = groups[side];
    return weight > 0 ? 100 * fullMatchWeight / weight : null;
  };
  return {
    count,
    fullMatchPercent: 100 * fullMatchWeight / totalWeight,
    fullMatchPercentByGroup: { left: groupPercent('left'), centre: groupPercent('centre'), right: groupPercent('right') },
    sharedAcrossGroupsPercent: sides.every(side => groups[side].weight > 0) ? 100 * sharedWeight / totalWeight : null,
  };
}
