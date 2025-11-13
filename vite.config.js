import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    // Optimize build output
    target: 'es2015',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // Manual chunking for better code splitting
        manualChunks: {
          'vue-vendor': ['vue'],
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 8080,
    open: true,
  },
  // Copy static assets
  publicDir: 'public',
})
