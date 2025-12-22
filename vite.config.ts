import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
          mediapipe: ['@mediapipe/face_detection', '@mediapipe/camera_utils']
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
});
