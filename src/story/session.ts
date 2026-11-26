import { isScore } from '../domain/model.ts';
import type { Choice, Score } from '../domain/model.ts';
import { isProfileValue } from '../domain/profiles.ts';
import type { HighlightFilter } from './highlights.ts';

export type Answers = Readonly<Partial<Record<number, Choice>>>;
type Progress = { score: Score; answers: Answers };
const offArcSteps = ['missing-prompt', 'engagement', 'trust', 'influence', 'listening-bridge'] as const;
type ActTwoStep = (typeof offArcSteps)[number];

export type Session =
  | { step: 'scale'; score: Score | null }
  | { step: 'among'; score: Score; highlight: HighlightFilter | null }
  | (Progress & { step: 'question'; index: number })
  | (Progress & { step: 'result'; index: number; option: Choice })
  | (Progress & { step: ActTwoStep })
  | (Progress & { step: 'conclusion' });

export type StoryAction =
  | { type: 'place'; score: number }
  | { type: 'filter'; selection: HighlightFilter | null }
  | { type: 'answer'; option: Choice }
  | { type: 'confirm' | 'start' | 'back' | 'next' | 'restart' };

export const initialSession: Session = { step: 'scale', score: null };

export function isActTwoStep(step: Session['step']) {
  return offArcSteps.some(stage => stage === step);
}

export function isOffArcStep(step: Session['step']) {
  return step !== 'missing-prompt' && offArcSteps.some(stage => stage === step);
}

export function createSessionReducer(questions: readonly string[], countries: readonly string[], includeActTwo = false) {
  const countryCodes = new Set(countries);
  const vote = includeActTwo ? questions.indexOf('vote') : -1;
  const hasOffArc = vote >= 0 && vote + 1 < questions.length;
  return (state: Session, action: StoryAction): Session => {
    const { step, score } = state;
    switch (step) {
      case 'scale':
        if (action.type === 'place' && isScore(action.score)) return { step: 'scale', score: action.score };
        if (action.type === 'confirm' && score !== null) return { step: 'among', score, highlight: null };
        break;
      case 'among':
        if (action.type === 'filter') {
          const { selection } = action;
          const valid = selection === null || (selection.key === 'country'
            ? countryCodes.has(selection.value)
            : isProfileValue(selection.key, selection.value));
          if (valid) return { ...state, highlight: selection };
        }
        if (action.type === 'back') return { step: 'scale', score };
        if (action.type === 'start' && questions.length) return { step: 'question', score, index: 0, answers: {} };
        break;
      case 'question':
        if (action.type === 'answer') {
          const answers = { ...state.answers, [state.index]: action.option };
          return { step: 'result', score, index: state.index, option: action.option, answers };
        }
        if (action.type === 'back') {
          if (hasOffArc && state.index === vote + 1) return { step: 'listening-bridge', score, answers: state.answers };
          return state.index === 0
            ? { step: 'among', score, highlight: null }
            : { step: 'question', score, index: state.index - 1, answers: state.answers };
        }
        break;
      case 'result':
        if (action.type === 'back') return { step: 'question', score, index: state.index, answers: state.answers };
        if (action.type === 'next') {
          if (hasOffArc && state.index === vote) return { step: 'missing-prompt', score, answers: state.answers };
          return state.index + 1 < questions.length
            ? { step: 'question', score, index: state.index + 1, answers: state.answers }
            : { step: 'conclusion', score, answers: state.answers };
        }
        break;
      case 'conclusion':
        if (action.type === 'back') {
          const index = questions.length - 1;
          const option = state.answers[index];
          if (option) return { step: 'result', score, index, option, answers: state.answers };
        }
        if (action.type === 'restart') return initialSession;
        break;
      default: {
        const position = offArcSteps.indexOf(step);
        if (action.type === 'next') {
          const next = offArcSteps[position + 1];
          return next ? { ...state, step: next } : { ...state, step: 'question', index: vote + 1 };
        }
        if (action.type === 'back') {
          const previous = offArcSteps[position - 1];
          if (previous) return { ...state, step: previous };
          const option = state.answers[vote];
          if (option) return { step: 'result', score, index: vote, option, answers: state.answers };
        }
      }
    }
    return state;
  };
}
