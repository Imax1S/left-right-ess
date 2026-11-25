import { readFile } from 'node:fs/promises';
import { isScore } from '../domain/model.ts';
import type { Answer, Respondent, SurveyAdapter } from '../domain/model.ts';
import { ess11Questions } from './questions.ts';
import { essProfile } from './profile.ts';

type EssQuestion = (typeof ess11Questions)[number];
interface Extract {
  source: { title: string; doi: string; license: string; fields: string[] };
  countries: Record<string, {
    years: number[];
    populationWeight: number;
    rows: (number | null)[][];
  }>;
}

const middleLabels: Partial<Record<EssQuestion['type'], string>> = {
  agreement: 'Neither agree nor disagree',
  policy: 'Neither in favour nor against',
  scale: 'Midpoint (5)',
  climate: 'Somewhat worried',
  climateCause: 'About equally',
  influence: 'Some',
};

function classify(type: EssQuestion['type'], value: number | null, climateCause: number | null): Answer {
  if ((type === 'climate' && climateCause === 55) || (type === 'climateCause' && value === 55)) return 'other';
  if (value === null || !Number.isInteger(value)) return 'missing';
  if (type === 'scale') return value < 0 || value > 10 ? 'missing' : value === 5 ? 'neutral' : value < 5 ? 'a' : 'b';
  if (type === 'vote') return value === 1 ? 'a' : value === 2 ? 'b' : value === 3 ? 'other' : 'missing';
  if (type === 'migration') return value < 1 || value > 4 ? 'missing' : value <= 2 ? 'a' : 'b';
  if (type === 'value') return value < 1 || value > 6 ? 'missing' : value <= 3 ? 'a' : 'b';
  if (value < 1 || value > 5) return 'missing';
  if (value === 3) return 'neutral';
  if (type === 'climate') return value >= 4 ? 'a' : 'b';
  return value <= 2 ? 'a' : 'b';
}

export async function ess11Source(
  extractUrl = new URL('../../data/ess11.json', import.meta.url),
): Promise<SurveyAdapter & { countryCodes: string[] }> {
  const extract: Extract = JSON.parse(await readFile(extractUrl, 'utf8'));
  const field = (name: string) => {
    const index = extract.source.fields.indexOf(name);
    if (index < 0) throw new Error(`ESS11 extract is missing the ${name} field`);
    return index;
  };
  const indexes = {
    id: field('idno'),
    age: field('agea'),
    scale: field('lrscale'),
    weight: field('pspwght'),
    climateCause: field('ccnthum'),
    gender: field('gndr'),
    religiosity: extract.source.fields.indexOf('rlgdgr'),
    education: extract.source.fields.indexOf('eisced'),
  };
  const codes = Object.keys(extract.countries);
  const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
  const yearRange = [...new Set(Object.values(extract.countries).flatMap(country => country.years))].sort();

  return {
    countryCodes: 'AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE'
      .split(' ').filter(code => codes.includes(code)).sort(),
    async load(config) {
      const questions = config.questions.map(id => {
        const question = ess11Questions.find(item => item.id === id);
        if (!question) throw new Error(`Unknown question: ${id}`);
        return { ...question, column: field(question.field) };
      });
      const people: Respondent[] = [];
      const countries = config.countries.map(code => {
        if (!Object.hasOwn(extract.countries, code)) throw new Error(`Unknown country: ${code}`);
        const country = extract.countries[code];
        if (!Number.isFinite(country.populationWeight) || country.populationWeight <= 0) {
          throw new Error(`Invalid population weight: ${code}`);
        }
        for (const row of country.rows) {
          const score = row[indexes.scale];
          const age = row[indexes.age];
          const weight = row[indexes.weight];
          if (score === null || !isScore(score) || age === null || !Number.isInteger(age) ||
              age < 15 || age > 110 || weight === null || !Number.isFinite(weight) || weight <= 0) continue;
          people.push({
            id: `${code}-${row[indexes.id]}`,
            country: code,
            score,
            weight: weight * country.populationWeight,
            profile: essProfile(age, row[indexes.gender], row[indexes.religiosity] ?? null, row[indexes.education] ?? null),
            answers: Object.fromEntries(questions.map(question => [
              question.id, classify(question.type, row[question.column], row[indexes.climateCause]),
            ])),
          });
        }
        return { code, name: regionNames.of(code) ?? code };
      });
      return {
        source: {
          title: extract.source.title,
          doi: extract.source.doi,
          license: extract.source.license,
          years: yearRange.length > 1 ? `${yearRange[0]}–${yearRange.at(-1)}` : String(yearRange[0]),
          records: Object.values(extract.countries).reduce((sum, country) => sum + country.rows.length, 0),
          countries: codes.length,
        },
        countries,
        questions: questions.map(({ id, short, title, labels, note, type }) => ({
          id, topic: short, prompt: title, options: { a: labels[0], neutral: middleLabels[type], b: labels[1] }, grouping: note,
        })),
        people,
      };
    },
  };
}
