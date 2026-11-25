import { choices } from '../domain/model.ts';
import type { Choice, StoryQuestion } from '../domain/model.ts';

interface SharedAnswer {
  question: StoryQuestion;
  choice: Choice;
  left: number;
  right: number;
}

export function sharedAnswer(questions: readonly StoryQuestion[]): SharedAnswer | null {
  let example: SharedAnswer | null = null;
  let overlap = 50;
  for (const question of questions) {
    for (const choice of choices) {
      const left = question.stats.left[choice].percent;
      const right = question.stats.right[choice].percent;
      if (left === null || right === null) continue;
      const shared = Math.min(left, right);
      if (shared <= overlap) continue;
      overlap = shared;
      example = { question, choice, left, right };
    }
  }
  return example;
}
