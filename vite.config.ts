import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  base: './',
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/a380': {
        target: 'http://127.0.0.1:3200',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/a380/, '/admin'),
      },
      '/uploads': {
        target: 'http://127.0.0.1:3200',
        changeOrigin: true,
      },
    },
  },
});
