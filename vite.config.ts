import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const env = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env;

// GitHub Pages は /newquickpanel/、Vercel はドメイン直下で配信する。
const base = env?.GITHUB_ACTIONS === 'true' ? '/newquickpanel/' : '/';

export default defineConfig({
  plugins: [react()],
  base,
});
