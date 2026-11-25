export const profileFacets = [
  { key: 'age', label: 'Age', options: [
    { value: '15-29', label: '15–29' }, { value: '30-44', label: '30–44' },
    { value: '45-59', label: '45–59' }, { value: '60+', label: '60+' },
  ] },
  { key: 'gender', label: 'Gender', options: [
    { value: 'women', label: 'Women' }, { value: 'men', label: 'Men' },
  ] },
  { key: 'education', label: 'Education', options: [
    { value: 'below-upper', label: 'Below upper secondary' },
    { value: 'upper-vocational', label: 'Upper secondary / vocational' },
    { value: 'tertiary', label: 'Tertiary' },
  ] },
  { key: 'religiosity', label: 'Religiosity', options: [
    { value: 'low', label: 'Low (0–3)' }, { value: 'middle', label: 'Middle (4–6)' }, { value: 'high', label: 'High (7–10)' },
  ] },
] as const;

export type ProfileKey = (typeof profileFacets)[number]['key'];
export type Profile = Partial<Record<ProfileKey, string>>;

export function isProfileValue(key: ProfileKey, value: string) {
  return profileFacets.find(facet => facet.key === key)?.options.some(option => option.value === value) ?? false;
}
