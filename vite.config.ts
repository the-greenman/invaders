import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // Ensure source maps for debugging
    sourcemap: true
  },
  server: {
    // Enable HTTPS for webcam access in development if needed
    https: false
  }
});
