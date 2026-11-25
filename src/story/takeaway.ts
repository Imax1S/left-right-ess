import { questionChoices, sides } from '../domain/model.ts';
import type { Choice, StoryQuestion } from '../domain/model.ts';

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
