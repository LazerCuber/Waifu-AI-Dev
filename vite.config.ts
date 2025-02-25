import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { fileURLToPath } from 'url';

export default defineConfig({
  plugins: [preact()],
  resolve: {
    alias: {
      '~': '/src',
      'react': 'preact/compat',
      'react-dom': 'preact/compat'
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  optimizeDeps: {
    exclude: ['live2dcubismcore'],
  },
  css: {
    postcss: './postcss.config.cjs'
  }
});