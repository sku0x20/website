// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.sku20.dev',

  markdown: {
      shikiConfig: {
          theme: 'css-variables',
      },
  },

  integrations: [sitemap()],
  vite: {
    build: {
      cssTarget: ['chrome100', 'firefox100', 'safari15', 'ios15'],
    },
  },
});