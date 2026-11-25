import type { Profile } from './profiles.ts';

export const scores = [0, 1, 2, 3, 4, 6, 7, 8, 9, 10] as const;
export type Score = (typeof scores)[number];
export type Side = 'left' | 'right';
export type Choice = 'a' | 'b';
export type Answer = Choice | 'other';
export const choices = ['a', 'b'] as const;
export const sides = ['left', 'right'] as const;

export function isScore(value: number): value is Score {
  return scores.some(score => score === value);
}

export function sideOf(score: Score): Side {
  return score < 5 ? 'left' : 'right';
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
  options: readonly [string, string];
  grouping: string;
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
  correlation: number | null;
}

export interface StoryData {
  source: SurveySource;
  eligibleCount: number;
  countries: Country[];
  questions: StoryQuestion[];
  dots: Dot[];
}
