import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['crypto', 'stream', 'util', 'events', 'buffer', 'process'],
      globals: {
        Buffer: true,
        process: true,
      },
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      stream: 'stream-browserify',
      https: 'https-browserify',
      os: 'os-browserify/browser',
      url: 'url',
    },
  },
  server: {
    port: 3000,
  },
});
