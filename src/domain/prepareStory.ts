import { choices, questionChoices, sideOf, sides } from './model.ts';
import type { Choice, Question, Respondent, StoryConfig, StoryData, StoryQuestion, SurveyAdapter } from './model.ts';
import { summarizeResponsePatterns } from './responsePatterns.ts';
import { sampleRespondents } from './sample.ts';
import { summarizeEngagement } from './actTwo.ts';

function weightedAssociation(rows: readonly (readonly number[])[]) {
  const columnWeights = choices.map((_, i) => rows.reduce((sum, row) => sum + row[i], 0));
  const totalWeight = columnWeights.reduce((sum, weight) => sum + weight, 0);
  const rowWeights = rows.map(row => row.reduce((sum, weight) => sum + weight, 0));
  const dimensions = Math.min(rowWeights.filter(weight => weight > 0).length,
    columnWeights.filter(weight => weight > 0).length) - 1;
  if (dimensions <= 0) return null;

  // Cramér's V for the weighted contingency table, without a significance test.
  let chiSquared = 0;
  rows.forEach((row, i) => row.forEach((observed, j) => {
    const expected = rowWeights[i] * columnWeights[j] / totalWeight;
    if (expected > 0) chiSquared += (observed - expected) ** 2 / expected;
  }));
  return Math.sqrt(chiSquared / (totalWeight * dimensions));
}

function summarize(people: Respondent[], question: Question): Pick<StoryQuestion, 'stats' | 'association'> {
  const empty = () => ({ count: 0, weight: 0 });
  const groups = () => ({ a: empty(), neutral: empty(), b: empty() });
  const tally = { left: groups(), centre: groups(), right: groups() };
  for (const person of people) {
    const answer = person.answers[question.id];
    if (answer !== 'a' && answer !== 'b' && (answer !== 'neutral' || question.options.neutral === undefined)) continue;
    const bucket = tally[sideOf(person.score)][answer];
    bucket.count++;
    bucket.weight += person.weight;
  }

  function shareFor(side: keyof typeof tally) {
    const row = tally[side];
    const total = choices.reduce((sum, answer) => sum + row[answer].count, 0);
    const weight = choices.reduce((sum, answer) => sum + row[answer].weight, 0);
    const share = (answer: Choice) => ({
      count: row[answer].count, total, percent: weight > 0 ? 100 * row[answer].weight / weight : null,
    });
    return { a: share('a'), neutral: share('neutral'), b: share('b') };
  }

  const stats = { left: shareFor('left'), centre: shareFor('centre'), right: shareFor('right') };
  const association = weightedAssociation(sides.map(side => choices.map(choice => tally[side][choice].weight)));
  return { stats, association };
}

export async function prepareStory(adapter: SurveyAdapter, config: StoryConfig): Promise<StoryData> {
  if (!Number.isSafeInteger(config.dotCount) || config.dotCount < 1) {
    throw new Error('dotCount must be a positive integer');
  }
  for (const key of ['questions', 'countries'] as const) {
    const items = config[key];
    if (!items.length || new Set(items).size !== items.length) {
      throw new Error('Configure at least one ' + key + ' value, with no duplicates');
    }
  }
  const { source, countries, questions, people, unplaced } = await adapter.load(config);
  if (!people.length) throw new Error('The selected countries have no eligible respondents');
  const compared = questions.map(question => ({ ...question, ...summarize(people, question) }));
  const displayedChoices = questions.map(questionChoices);
  const complete = people.filter(person => questions.every((question, index) =>
    displayedChoices[index].some(choice => choice === person.answers[question.id])));
  const vote = config.questions.indexOf('vote');
  const actTwo = vote >= 0 && config.questions.indexOf('understanding') > vote;
  return {
    source,
    countries,
    questions: compared,
    responsePatterns: summarizeResponsePatterns(people, compared),
    disillusioned: actTwo && unplaced ? summarizeEngagement(people, unplaced) : null,
    eligibleCount: people.length,
    dots: sampleRespondents(complete, countries, config.dotCount),
  };
}
