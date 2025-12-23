import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    // Exclude MediaPipe from pre-bundling to avoid constructor issues
    exclude: ['@mediapipe/face_detection', '@mediapipe/camera_utils']
  },
  build: {
    // Ensure MediaPipe is properly externalized in production
    rollupOptions: {
      output: {
        // Don't mangle MediaPipe constructor names
        manualChunks: (id) => {
          if (id.includes('@mediapipe')) {
            return 'mediapipe';
          }
        }
      }
    },
    // Increase chunk size warning limit for MediaPipe
    chunkSizeWarningLimit: 1000,
    // Ensure source maps for debugging
    sourcemap: true
  },
  server: {
    // Enable HTTPS for webcam access in development if needed
    https: false
  }
});
