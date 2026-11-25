import type { Dot } from '../domain/model.ts';
import { profileFacets } from '../domain/profiles.ts';
import type { Profile } from '../domain/profiles.ts';

export function matchesHighlights(dot: Dot, country: string | null, filters: Profile) {
  return (country === null || dot.country === country)
    && profileFacets.every(({ key }) => filters[key] === undefined || dot.profile?.[key] === filters[key]);
}
