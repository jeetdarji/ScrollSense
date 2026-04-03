import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages':      path.resolve(__dirname, './src/pages'),
      '@hooks':      path.resolve(__dirname, './src/hooks'),
      '@store':      path.resolve(__dirname, './src/store'),
      '@api':        path.resolve(__dirname, './src/api'),
      '@utils':      path.resolve(__dirname, './src/utils'),
      '@lib':        path.resolve(__dirname, './src/lib'),
      '@constants':  path.resolve(__dirname, './src/constants'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})