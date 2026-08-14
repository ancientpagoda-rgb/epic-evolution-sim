import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/epic-evolution-sim/' : '/',
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      input: 'app.html',
    },
  },
  worker: {
    format: 'es',
  },
}));
