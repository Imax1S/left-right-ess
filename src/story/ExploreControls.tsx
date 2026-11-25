import { useState } from 'react';
import type { Country, Dot } from '../domain/model.ts';
import { profileFacets } from '../domain/profiles.ts';
import { Continue } from './controls.tsx';
import type { HighlightFilter, HighlightKey } from './highlights.ts';

interface Props {
  countries: Country[];
  dots: Dot[];
  selection: HighlightFilter | null;
  onSelect: (selection: HighlightFilter | null) => void;
  onStart: () => void;
}

export function ExploreControls({ countries, dots, selection, onSelect, onStart }: Props) {
  const [open, setOpen] = useState<HighlightKey>('country');
  const facets = [
    { key: 'country' as const, label: 'Country', options: countries.map(({ code, name }) => ({ value: code, label: name })) },
    ...profileFacets.filter(facet => dots.some(dot => dot.profile?.[facet.key] !== undefined)),
  ];
  const active = facets.find(facet => facet.key === open) ?? facets[0];
  const selectedLabel = facets.find(facet => facet.key === selection?.key)
    ?.options.find(option => option.value === selection?.value)?.label;

  return <>
    <section className="filter-picker" aria-labelledby="highlight-label">
      <div className="filter-heading">
        <h2 id="highlight-label">Highlight people <span>· Optional</span></h2>
        <button className="filter-clear" type="button" disabled={!selection}
          onClick={() => onSelect(null)}>Clear filter</button>
      </div>
      <div className="filter-categories" role="group" aria-label="Filter categories">
        {facets.map(facet => <button key={facet.key} type="button" aria-pressed={facet.key === active.key}
          onClick={() => setOpen(facet.key)}>{facet.label}</button>)}
      </div>
      <div key={active.key} className={active.key === 'country' ? 'filter-chips country-options' : 'filter-chips'}
        role="group" aria-label={active.label}>
        {active.options.map(option => {
          const selected = selection?.key === active.key && selection.value === option.value;
          return <button key={option.value} type="button" aria-pressed={selected}
            onClick={() => onSelect(selected ? null : { key: active.key, value: option.value })}>{option.label}</button>;
        })}
      </div>
      <p className="filter-note" role="status">
        {selectedLabel ? <>Highlighting <strong>{selectedLabel}</strong></> : 'No filter applied'}
      </p>
    </section>
    <Continue onClick={onStart}>To the first question</Continue>
  </>;
}
