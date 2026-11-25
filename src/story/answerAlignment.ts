import { sideOf, sides } from '../domain/model.ts';
import type { Choice, Score, Side, StoryQuestion } from '../domain/model.ts';

export interface AnswerAlignment {
  side: Side | null;
  score: Score;
  gap: number | null;
}

export function answerAlignment(stats: StoryQuestion['stats'], choice: Choice, score: Score): AnswerAlignment {
  const shares = sides.flatMap(side => {
    const percent = stats[side][choice].percent;
    return percent === null ? [] : [{ side, share: Math.round(percent * 10) }];
  });
  if (shares.length < 2) return { side: null, score, gap: null };

  const maximum = Math.max(...shares.map(({ share }) => share));
  const gap = (maximum - Math.min(...shares.map(({ share }) => share))) / 10;
  const leaders = shares.filter(({ share }) => share === maximum);
  if (leaders.length !== 1) return { side: null, score, gap };
  const { side } = leaders[0];
  if (side === sideOf(score)) return { side, score, gap };
  if (side === 'centre') return { side, score: 5, gap };
  if (score === 5) return { side, score: side === 'left' ? 3 : 7, gap };
  return { side, score: (10 - score) as Score, gap };
}
