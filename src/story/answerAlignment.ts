import { scores, sideOf } from '../domain/model.ts';
import type { Choice, Score, Side, StoryQuestion } from '../domain/model.ts';

export interface AnswerAlignment {
  side: Side | null;
  score: Score;
  gap: number | null;
}

export function answerAlignment(stats: StoryQuestion['stats'], choice: Choice, score: Score): AnswerAlignment {
  const left = stats.left[choice].percent;
  const right = stats.right[choice].percent;
  if (left === null || right === null) return { side: null, score, gap: null };

  const difference = Math.round(left * 10) - Math.round(right * 10);
  if (difference === 0) return { side: null, score, gap: 0 };
  const side = difference > 0 ? 'left' : 'right';
  return {
    side,
    score: side === sideOf(score) ? score : scores[scores.length - 1 - scores.indexOf(score)],
    gap: Math.abs(difference) / 10,
  };
}
