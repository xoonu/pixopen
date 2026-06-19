import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [tailwindcss(), react()],
  build: {
    rollupOptions: {
      onwarn(warning, defaultHandler) {
        if (warning.message.includes('contains an annotation that Rollup cannot interpret')) {
          return;
        }
        defaultHandler(warning);
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3847',
      '/ws': { target: 'ws://localhost:3847', ws: true },
    },
  },
});
