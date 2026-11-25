import { questionChoices, sideOf, sides } from '../domain/model.ts';
import type { Choice, Score, StoryQuestion } from '../domain/model.ts';

import type { Answers } from './session.ts';

interface Example {
  question: StoryQuestion;
  choice: Choice;
}

export function takeawayExamples(questions: readonly StoryQuestion[]) {
  let agreement: Example | null = null;
  let widest: Example | null = null;
  let commonShare = 50;
  let widestGap = 0;

  for (const question of questions) {
    for (const choice of questionChoices(question)) {
      const shares = sides.map(side => question.stats[side][choice].percent);
      if (shares.some(share => share === null)) continue;
      const available = shares.filter(share => share !== null);
      const min = Math.min(...available);
      const max = Math.max(...available);
      const gap = Math.round(max * 10) - Math.round(min * 10);
      if (min > commonShare) {
        commonShare = min;
        agreement = { question, choice };
      }
      if (gap > widestGap) {
        widestGap = gap;
        widest = { question, choice };
      }
    }
  }

  return { agreement, widest };
}

export function groupMatch(questions: readonly StoryQuestion[], score: Score, answers: Answers) {
  const side = sideOf(score);
  let matches = 0;
  let compared = 0;
  questions.forEach((question, index) => {
    const choice = answers[index];
    if (choice === undefined) return;
    const selected = question.stats[side][choice].percent;
    if (selected === null) return;

    const mostCommon = Math.max(...questionChoices(question).map(option => question.stats[side][option].percent ?? 0));
    if (Math.round(selected * 10) === Math.round(mostCommon * 10)) matches++;
    compared++;
  });
  return { matches, compared };
}
