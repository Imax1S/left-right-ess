import { isScore } from '../domain/model.ts';
import type { Choice, Score } from '../domain/model.ts';
import { isProfileValue } from '../domain/profiles.ts';
import type { HighlightFilter } from './highlights.ts';

export type Session =
  | { step: 'scale'; score: Score | null }
  | { step: 'among'; score: Score; highlight: HighlightFilter | null }
  | { step: 'question'; score: Score; index: number }
  | { step: 'result'; score: Score; index: number; option: Choice }
  | { step: 'conclusion'; score: Score; lastAnswer: Choice };

export type StoryAction =
  | { type: 'place'; score: number }
  | { type: 'filter'; selection: HighlightFilter | null }
  | { type: 'answer'; option: Choice }
  | { type: 'confirm' | 'start' | 'back' | 'next' | 'restart' };

export const initialSession: Session = { step: 'scale', score: null };

export function createSessionReducer(questions: readonly string[], countries: readonly string[]) {
  const countryCodes = new Set(countries);
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
        if (action.type === 'start' && questions.length) return { step: 'question', score, index: 0 };
        break;
      case 'question':
        if (action.type === 'answer') return { ...state, step: 'result', option: action.option };
        if (action.type === 'back') {
          return state.index === 0
            ? { step: 'among', score, highlight: null }
            : { step: 'question', score, index: state.index - 1 };
        }
        break;
      case 'result':
        if (action.type === 'back') return { step: 'question', score, index: state.index };
        if (action.type === 'next') {
          return state.index + 1 < questions.length
            ? { step: 'question', score, index: state.index + 1 }
            : { step: 'conclusion', score, lastAnswer: state.option };
        }
        break;
      case 'conclusion':
        if (action.type === 'back') {
          return { step: 'result', score, index: questions.length - 1, option: state.lastAnswer };
        }
        if (action.type === 'restart') return initialSession;
        break;
    }
    return state;
  };
}
