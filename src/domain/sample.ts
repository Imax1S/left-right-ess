import type { Country, Dot, Respondent } from './model.ts';

function priority(person: Respondent) {
  // Keep the ESS11 story's deterministic, weighted sampling order.
  let hash = 2166136261;
  for (const char of person.id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d);
  hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b);
  const uniform = (((hash ^ (hash >>> 16)) >>> 0) + 1) / 4294967297;
  return -Math.log(uniform) / person.weight;
}

export function sampleRespondents(people: Respondent[], countries: Country[], desiredCount: number): Dot[] {
  if (desiredCount < countries.length) {
    throw new Error(`dotCount must be at least ${countries.length} to show every selected country`);
  }

  const byCountry = new Map(countries.map(country => [country.code, {
    members: [] as Respondent[],
    weight: 0,
    seats: 1,
    quota: 0,
  }]));
  let totalWeight = 0;
  for (const person of people) {
    const group = byCountry.get(person.country)!;
    group.members.push(person);
    group.weight += person.weight;
    totalWeight += person.weight;
  }

  const count = Math.min(desiredCount, people.length);
  const strata = [...byCountry.values()];
  for (const country of countries) {
    const group = byCountry.get(country.code)!;
    if (!group.members.length) throw new Error(`No eligible respondents in ${country.name}`);
    group.quota = count * group.weight / totalWeight;
  }

  // Start with one seat per country. Each additional seat goes to the eligible
  // group furthest below its full weighted quota, keeping distortion small.
  for (let seat = strata.length; seat < count; seat++) {
    let next: (typeof strata)[number] | undefined;
    for (const group of strata) {
      if (group.seats < group.members.length &&
          (!next || group.quota - group.seats > next.quota - next.seats)) next = group;
    }
    next!.seats++;
  }

  return strata.flatMap(group => group.members.map(person => ({ person, priority: priority(person) }))
    .sort((a, b) => a.priority - b.priority || a.person.id.localeCompare(b.person.id))
    .slice(0, group.seats))
    .sort((a, b) => a.priority - b.priority || a.person.id.localeCompare(b.person.id))
    .map(({ person }, index) => ({
      id: String(index + 1),
      score: person.score,
      country: person.country,
      answers: person.answers,
      profile: person.profile,
    }));
}
