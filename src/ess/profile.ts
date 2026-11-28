import type { Profile } from '../domain/profiles.ts';

export function essProfile(
  age: number, gender: number | null, religiosity: number | null, education: number | null,
): Profile {
  const profile: Profile = {
    age: age < 30 ? '15-29' : age < 45 ? '30-44' : age < 60 ? '45-59' : '60+',
  };
  if (gender === 1 || gender === 2) profile.gender = gender === 1 ? 'men' : 'women';
  if (religiosity !== null && Number.isInteger(religiosity) && religiosity >= 0 && religiosity <= 10) {
    profile.religiosity = religiosity <= 3 ? 'low' : religiosity <= 6 ? 'middle' : 'high';
  }
  if (education !== null && Number.isInteger(education) && education >= 1 && education <= 7) {
    profile.education = education <= 2 ? 'below-upper'
      : education <= 5 ? 'upper-vocational'
      : education === 6 ? 'bachelor' : 'master-or-higher';
  }
  return profile;
}
