import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import config from './story.config.ts';
import { prepareStory } from './src/domain/prepareStory.ts';
import { ess11Source } from './src/ess/source.ts';

function storyData(json: string): Plugin {
  return {
    name: 'story-data',
    configureServer(server) {
      server.middlewares.use('/story.json', (_request, response) => {
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        response.setHeader('Cache-Control', 'no-cache');
        response.end(json);
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'story.json', source: json });
    },
  };
}

export default defineConfig(async () => {
  const data = await prepareStory(await ess11Source(), config);
  return {
    base: './',
    plugins: [react(), storyData(JSON.stringify(data))],
  };
});
