import { choices, sideOf, sides } from './model.ts';
import type { Respondent, StoryConfig, StoryData, StoryQuestion, SurveyAdapter } from './model.ts';
import { sampleRespondents } from './sample.ts';

function summarize(people: Respondent[], id: string): StoryQuestion['stats'] {
  const empty = () => ({ a: { count: 0, weight: 0 }, b: { count: 0, weight: 0 } });
  const tally = { left: empty(), right: empty() };
  for (const person of people) {
    const answer = person.answers[id];
    if (answer !== 'a' && answer !== 'b') continue;
    const group = tally[sideOf(person.score)][answer];
    group.count++;
    group.weight += person.weight;
  }

  const result = {} as StoryQuestion['stats'];
  for (const side of sides) {
    const total = choices.reduce((sum, answer) => sum + tally[side][answer].count, 0);
    const weight = choices.reduce((sum, answer) => sum + tally[side][answer].weight, 0);
    result[side] = {} as StoryQuestion['stats'][typeof side];
    for (const answer of choices) {
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
    dots: sampleRespondents(people, countries, config.dotCount),
  };
}
