import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages のプロジェクトサイト: https://udonrx.github.io/newquickpanel/
  base: '/newquickpanel/',
});
