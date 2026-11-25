import type { Dot } from '../domain/model.ts';
import type { ProfileKey } from '../domain/profiles.ts';

export type HighlightKey = 'country' | ProfileKey;
export type HighlightFilter = { key: HighlightKey; value: string };

export function matchesHighlights(dot: Dot, filter: HighlightFilter) {
  return filter.key === 'country' ? dot.country === filter.value : dot.profile?.[filter.key] === filter.value;
}
