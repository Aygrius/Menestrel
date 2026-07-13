/// <reference types="vitest/config" />
/* Vitest usa este arquivo em vez do vite.config.ts quando ele existe —
   por isso o plugin react (runtime CLASSIC, igual ao vite.config) é
   redeclarado aqui: os arquivos de fase dependem dele pro JSX. */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react({ jsxRuntime: 'classic' })],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup-fases.ts'],
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
  },
});
