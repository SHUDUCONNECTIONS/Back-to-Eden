import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

/**
 * The web app now runs on its own Vite server and talks to the NestJS backend
 * over HTTP, instead of being mounted as middleware inside the API process.
 *
 * The proxy below is what keeps every existing client path working unchanged:
 * the app still calls /api/... and /uploads/... as if they were local, and Vite
 * forwards them to the backend. Nothing in src/ had to know the API moved.
 */
const BACKEND = process.env.BACKEND_URL || 'http://localhost:3001';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        // Types shared with the Expo app live outside this package.
        '@shared': path.resolve(__dirname, '..', 'shared'),
      },
    },
    server: {
      port: 5173,
      // The translation dictionaries live in ../shared (the Expo app uses them too).
      fs: { allow: [path.resolve(__dirname, '..')] },
      proxy: {
        '/api': { target: BACKEND, changeOrigin: true },
        '/uploads': { target: BACKEND, changeOrigin: true },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
