import { isScore } from '../domain/model.ts';
import type { Choice, Score } from '../domain/model.ts';

export type Session = { score: Score } & (
  | { step: 'scale' }
  | { step: 'among'; country: string | null }
  | { step: 'question'; index: number }
  | { step: 'result'; index: number; option: Choice }
);

export type StoryAction =
  | { type: 'place'; score: number }
  | { type: 'country'; code: string }
  | { type: 'answer'; option: Choice }
  | { type: 'confirm' | 'start' | 'back' | 'next' | 'restart' };

export const initialSession: Session = { step: 'scale', score: 3 };

export function createSessionReducer(questions: readonly string[], countries: readonly string[]) {
  const countryCodes = new Set(countries);
  return (state: Session, action: StoryAction): Session => {
    const { score } = state;
    switch (state.step) {
      case 'scale':
        if (action.type === 'place' && isScore(action.score)) return { step: 'scale', score: action.score };
        if (action.type === 'confirm') return { step: 'among', score, country: null };
        break;
      case 'among':
        if (action.type === 'country' && countryCodes.has(action.code)) {
          return { ...state, country: state.country === action.code ? null : action.code };
        }
        if (action.type === 'back') return { step: 'scale', score };
        if (action.type === 'start' && questions.length) return { step: 'question', score, index: 0 };
        break;
      case 'question':
        if (action.type === 'answer') return { ...state, step: 'result', option: action.option };
        if (action.type === 'back') {
          return state.index === 0
            ? { step: 'among', score, country: null }
            : { step: 'question', score, index: state.index - 1 };
        }
        break;
      case 'result':
        if (action.type === 'back') return { step: 'question', score, index: state.index };
        if (action.type === 'next' && state.index + 1 < questions.length) {
          return { step: 'question', score, index: state.index + 1 };
        }
        if (action.type === 'restart' && state.index === questions.length - 1) return initialSession;
        break;
    }
    return state;
  };
}
