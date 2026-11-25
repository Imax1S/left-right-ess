import { useState } from 'react';
import { sideOf } from '../domain/model.ts';
import type { Country, Dot } from '../domain/model.ts';
import { profileFacets } from '../domain/profiles.ts';
import type { Profile, ProfileKey } from '../domain/profiles.ts';
import { Continue } from './controls.tsx';

interface Props {
  countries: Country[];
  country: string | null;
  dots: Dot[];
  filters: Profile;
  matches: Dot[] | null;
  onCountry: (code: string) => void;
  onFilter: (key: ProfileKey, value: string | null) => void;
  onStart: () => void;
}

export function ExploreControls({ countries, country, dots, filters, matches, onCountry, onFilter, onStart }: Props) {
  const [open, setOpen] = useState<ProfileKey | null>(null);
  const available = profileFacets.filter(facet => dots.some(dot => dot.profile?.[facet.key] !== undefined));
  const active = available.find(facet => facet.key === open);
  const countryName = countries.find(item => item.code === country)?.name;
  const filteredByProfile = Object.keys(filters).length > 0;
  let note = 'Choose a filter to highlight people on the arc.';
  if (matches) {
    const left = matches.filter(dot => sideOf(dot.score) === 'left').length;
    const label = countryName && !filteredByProfile ? `${countryName}: ` : '';
    note = matches.length
      ? `${label}${matches.length} shown · ${left} left, ${matches.length - left} right.`
      : `No matches among the ${dots.length} people shown.`;
  }

  return <>
    <section className="country-picker" aria-labelledby="highlight-label">
      <h2 id="highlight-label">Highlight people <span>· Optional</span></h2>
      {available.length > 0 && <div className="profile-shortcuts" role="group" aria-label="Profile filters">
        {available.map(facet => {
          const selected = facet.options.find(option => option.value === filters[facet.key]);
          return <button key={facet.key} aria-expanded={open === facet.key}
            aria-controls={open === facet.key ? 'profile-options' : undefined}
            data-filtered={selected ? 'true' : undefined}
            onClick={() => setOpen(open === facet.key ? null : facet.key)}>
            {facet.label}{selected && <small>{selected.label}</small>}
          </button>;
        })}
      </div>}
      {active && <div id="profile-options" className="profile-options" role="group" aria-label={active.label}>
        <button aria-pressed={!filters[active.key]} onClick={() => onFilter(active.key, null)}>Any</button>
        {active.options.map(option => <button key={option.value} aria-pressed={filters[active.key] === option.value}
          onClick={() => onFilter(active.key, filters[active.key] === option.value ? null : option.value)}>
          {option.label}
        </button>)}
      </div>}
      <h2 id="country-label" className="country-label">Country</h2>
      <div className="country-options" role="group" aria-labelledby="country-label">
        {countries.map(item => <button key={item.code} aria-pressed={item.code === country}
          onClick={() => onCountry(item.code)}>{item.name}</button>)}
      </div>
      <p className="country-note" aria-live="polite">{note}</p>
    </section>
    <Continue onClick={onStart}>To the first question</Continue>
  </>;
}
