import { answers, sideOf, sides } from './model.ts';
import type { Respondent, StoryConfig, StoryData, StoryQuestion, SurveyAdapter } from './model.ts';

function priority(person: Respondent) {
  // Keep the ESS11 story's deterministic, weighted sampling order.
  let hash = 2166136261;
  for (const char of person.id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d);
  hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b);
  const uniform = (((hash ^ (hash >>> 16)) >>> 0) + 1) / 4294967297;
  return -Math.log(uniform) / person.weight;
}

function weightedSample(people: Respondent[], count: number) {
  return people.map(person => ({ person, priority: priority(person) }))
    .sort((a, b) => a.priority - b.priority || a.person.id.localeCompare(b.person.id))
    .slice(0, count)
    .map(({ person }, index) => ({
      id: String(index + 1),
      score: person.score,
      country: person.country,
      answers: person.answers,
    }));
}

function summarize(people: Respondent[], id: string): StoryQuestion['stats'] {
  const empty = () => ({ a: { count: 0, weight: 0 }, b: { count: 0, weight: 0 }, other: { count: 0, weight: 0 } });
  const tally = { left: empty(), right: empty() };
  for (const person of people) {
    const group = tally[sideOf(person.score)][person.answers[id]];
    group.count++;
    group.weight += person.weight;
  }

  const result = {} as StoryQuestion['stats'];
  for (const side of sides) {
    const total = answers.reduce((sum, answer) => sum + tally[side][answer].count, 0);
    const weight = answers.reduce((sum, answer) => sum + tally[side][answer].weight, 0);
    result[side] = {} as StoryQuestion['stats'][typeof side];
    for (const answer of answers) {
      const entry = tally[side][answer];
      result[side][answer] = {
        count: entry.count,
        total,
        percent: weight > 0 ? 100 * entry.weight / weight : null,
      };
    }
  }
  return result;
}

export async function prepareStory(adapter: SurveyAdapter, config: StoryConfig): Promise<StoryData> {
  if (!Number.isSafeInteger(config.dotCount) || config.dotCount < 1) {
    throw new Error('dotCount must be a positive integer');
  }
  for (const key of ['questions', 'countries'] as const) {
    const items = config[key];
    if (!items.length || new Set(items).size !== items.length) {
      throw new Error(`Configure at least one ${key === 'questions' ? 'question' : 'country'}, with no duplicates`);
    }
  }
  const { source, countries, questions, people } = await adapter.load(config);
  if (!people.length) throw new Error('The selected countries have no eligible respondents');
  return {
    source,
    countries,
    questions: questions.map(question => ({ ...question, stats: summarize(people, question.id) })),
    eligibleCount: people.length,
    dots: weightedSample(people, config.dotCount),
  };
}
