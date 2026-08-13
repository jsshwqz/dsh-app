import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer/src'),
      '@components': path.resolve(__dirname, 'src/renderer/src/components'),
      '@hooks': path.resolve(__dirname, 'src/renderer/src/hooks'),
      '@lib': path.resolve(__dirname, 'src/renderer/src/lib'),
      '@assets': path.resolve(__dirname, 'src/renderer/src/assets'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'src/renderer/dist'),
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    cors: false,
  },
})
