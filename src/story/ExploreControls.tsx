import { useEffect, useRef, useState } from 'react';
import { sideOf } from '../domain/model.ts';
import type { Country, Dot } from '../domain/model.ts';
import { profileFacets } from '../domain/profiles.ts';
import { Arrow, Continue } from './controls.tsx';
import type { HighlightFilter, HighlightKey } from './highlights.ts';

interface Props {
  countries: Country[];
  dots: Dot[];
  selection: HighlightFilter | null;
  matches: Dot[] | null;
  onSelect: (selection: HighlightFilter | null) => void;
  onStart: () => void;
}

export function ExploreControls({ countries, dots, selection, matches, onSelect, onStart }: Props) {
  const [open, setOpen] = useState<HighlightKey | null>(null);
  const backButton = useRef<HTMLButtonElement>(null);
  const categoryButtons = useRef<Partial<Record<HighlightKey, HTMLButtonElement>>>({});
  const previousOpen = useRef<HighlightKey | null>(null);
  const facets = [
    { key: 'country' as const, label: 'Country', options: countries.map(({ code, name }) => ({ value: code, label: name })) },
    ...profileFacets.filter(facet => dots.some(dot => dot.profile?.[facet.key] !== undefined)),
  ];
  const active = facets.find(facet => facet.key === open);
  const selectedLabel = facets.find(facet => facet.key === selection?.key)
    ?.options.find(option => option.value === selection?.value)?.label;

  useEffect(() => {
    if (open) {
      backButton.current?.focus({ preventScroll: true });
    } else if (previousOpen.current) {
      categoryButtons.current[previousOpen.current]?.focus({ preventScroll: true });
    }
    previousOpen.current = open;
  }, [open]);

  let note = 'Choose a filter to highlight people on the arc.';
  if (matches) {
    const left = matches.filter(dot => sideOf(dot.score) === 'left').length;
    note = matches.length
      ? `${selectedLabel ? `${selectedLabel}: ` : ''}${matches.length} shown · ${left} left, ${matches.length - left} right.`
      : `No matches among the ${dots.length} people shown.`;
  }

  return <>
    <section className="country-picker" aria-labelledby="highlight-label">
      <h2 id="highlight-label">Highlight people <span>· Optional</span></h2>
      {active ? <>
        <div className="filter-navigation">
          <button className="filter-back" type="button" ref={backButton} onClick={() => setOpen(null)}>
            <Arrow back /> All filters
          </button>
          <span>{active.label}</span>
        </div>
        <div className={`filter-chips${active.key === 'country' ? ' country-options' : ''}`}
          role="group" aria-label={active.label}>
          <button type="button" aria-pressed={selection === null} onClick={() => onSelect(null)}>All people</button>
          {active.options.map(option => {
            const selected = selection?.key === active.key && selection.value === option.value;
            return <button key={option.value} type="button" aria-pressed={selected}
              onClick={() => onSelect({ key: active.key, value: option.value })}>{option.label}</button>;
          })}
        </div>
      </> : <div className="filter-chips filter-categories" role="group" aria-label="Filter categories">
        {facets.map(facet => {
          const selected = selection?.key === facet.key;
          return <button key={facet.key} type="button" data-filtered={selected ? 'true' : undefined}
            ref={button => { if (button) categoryButtons.current[facet.key] = button; }}
            onClick={() => setOpen(facet.key)}>
            {facet.label}{selected && selectedLabel ? <> <small>{selectedLabel}</small></> : null}
          </button>;
        })}
        {selection && <button type="button" onClick={() => onSelect(null)}>Clear filter</button>}
      </div>}
      <p className="country-note" aria-live="polite">{note}</p>
    </section>
    <Continue onClick={onStart}>To the first question</Continue>
  </>;
}
