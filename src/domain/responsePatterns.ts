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
  const groups = new Set<Side>();
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
    groups.add(side);
    const common = typical.get(side)!;
    if (answers.every((answer, index) => common[index].includes(answer))) fullMatchWeight += person.weight;

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
  return {
    count,
    fullMatchPercent: 100 * fullMatchWeight / totalWeight,
    sharedAcrossGroupsPercent: groups.size === sides.length ? 100 * sharedWeight / totalWeight : null,
  };
}
