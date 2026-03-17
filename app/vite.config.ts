import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    nodePolyfills({
      include: ['crypto', 'stream', 'util', 'events', 'buffer', 'process'],
      globals: {
        Buffer: true,
        process: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@sdk': path.resolve(__dirname, '../solana-program/SDK'),
      os: 'os-browserify/browser',
      stream: 'stream-browserify',
      https: 'https-browserify',
      url: 'url',
    },
  },
});
