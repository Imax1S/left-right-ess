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

export function summarizeGaps(questions: readonly StoryQuestion[]) {
  const gaps: number[] = [];
  let sharedMajorityCount = 0;
  for (const { stats } of questions) {
    const left = stats.left.a.percent;
    const right = stats.right.a.percent;
    if (left === null || right === null) continue;

    gaps.push(Math.abs(left - right));
    if ((left > 50 && right > 50) || (left < 50 && right < 50)) sharedMajorityCount++;
  }

  return gaps.length
    ? { min: Math.min(...gaps), max: Math.max(...gaps), comparableCount: gaps.length, sharedMajorityCount }
    : null;
}
