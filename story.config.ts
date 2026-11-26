import type { StoryConfig } from './src/domain/model.ts';

export default {
  questions: ['inequality', 'migration', 'adoption', 'climate', 'vote', 'understanding'],
  countries: ['AT', 'BE', 'BG', 'HR', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU',
    'IE', 'IT', 'LV', 'LT', 'NL', 'PL', 'PT', 'SK', 'SI', 'ES', 'SE'],
  dotCount: 100,
} satisfies StoryConfig;
