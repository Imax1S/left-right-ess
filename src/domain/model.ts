import type { Profile } from './profiles.ts';

export const scores = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export type Score = (typeof scores)[number];
export const sides = ['left', 'centre', 'right'] as const;
export type Side = (typeof sides)[number];
export const sideLabels = { left: 'Left', centre: 'Centre (5)', right: 'Right' } as const;
export const choices = ['a', 'neutral', 'b'] as const;
export type Choice = (typeof choices)[number];
export type Answer = Choice | 'missing' | 'other';

export function isScore(value: number): value is Score {
  return scores.some(score => score === value);
}

export function sideOf(score: Score): Side {
  return score === 5 ? 'centre' : score < 5 ? 'left' : 'right';
}

export interface StoryConfig {
  questions: readonly string[];
  countries: readonly string[];
  dotCount: number;
}

export interface Question {
  id: string;
  topic: string;
  prompt: string;
  options: Readonly<Record<'a' | 'b', string> & { neutral?: string }>;
  grouping: string;
}

export function questionChoices(question: Pick<Question, 'options'>): readonly Choice[] {
  return question.options.neutral === undefined ? ['a', 'b'] : choices;
}

export interface Country {
  code: string;
  name: string;
}

export interface SurveySource {
  title: string;
  doi: string;
  years: string;
  license: string;
  records: number;
  countries: number;
}

export interface Respondent {
  id: string;
  country: string;
  score: Score;
  weight: number;
  answers: Record<string, Answer>;
  profile?: Profile;
}

export interface SurveyData {
  source: SurveySource;
  countries: Country[];
  questions: Question[];
  people: Respondent[];
}

export interface SurveyAdapter {
  load(config: Pick<StoryConfig, 'countries' | 'questions'>): Promise<SurveyData>;
}

export interface Dot {
  id: string;
  score: Score;
  country: string;
  answers: Record<string, Answer>;
  profile?: Profile;
}

export interface Share {
  count: number;
  total: number;
  percent: number | null;
}

export interface StoryQuestion extends Question {
  stats: Record<Side, Record<Choice, Share>>;
  association: number | null;
}

export interface ResponsePatterns {
  count: number;
  fullMatchPercent: number;
  fullMatchPercentByGroup: Record<Side, number | null>;
  sharedAcrossGroupsPercent: number | null;
}

export interface StoryData {
  source: SurveySource;
  eligibleCount: number;
  countries: Country[];
  questions: StoryQuestion[];
  responsePatterns: ResponsePatterns | null;
  dots: Dot[];
}
